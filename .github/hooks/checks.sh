#!/usr/bin/env sh
#
# Fonte única de verdade para TODOS os checks de qualidade.
#
# É usada de duas formas:
#   1. Pelos workflows reutilizáveis em .github/workflows/check-*.yml:
#        sh .github/hooks/checks.sh <check>
#   2. Pelos git hooks neste diretório, que a carregam com `.` e chamam
#      run_check <check>.
#
# Assim Actions e hooks executam exatamente os mesmos comandos.
#
# Checks disponíveis:
#   conventional-commits | format | lint | biome | typecheck | test
#   coverage | build | secrets | dependencies | env | database
#   fixtures | governance | all
#
set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

run_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  elif command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
  elif [ -x "${HOME}/.local/bin/pnpm" ]; then
    "${HOME}/.local/bin/pnpm" "$@"
  else
    echo "erro: pnpm não encontrado. Instale com 'corepack enable'." >&2
    exit 1
  fi
}

# Placeholders apenas para CI/hooks locais. Nunca use estes valores em produção:
# `pnpm check:env` com variáveis reais é a validação de deploy.
# Fonte única dos valores de ambiente de CI. Cada variável só recebe o
# placeholder se ainda não estiver definida — assim os workflows não precisam
# repetir o mesmo bloco `env:` e os valores reais de produção nunca são
# sobrescritos.
placeholder_env() {
  set_default() {
    name="$1"
    value="$2"
    eval "current=\${${name}:-}"
    if [ -z "$current" ]; then
      export "${name}=${value}"
      echo "[checks] ${name} não definida: usando placeholder de CI" >&2
    fi
  }

  set_default APP_ENV "production"
  set_default DEV_TEAM_PRODUCTION_ACCESS "false"
  set_default BETTER_AUTH_SECRET "hooks-placeholder-not-used-at-runtime-000000"
  set_default BETTER_AUTH_URL "https://localhost:3000"
  set_default TLS_MIN_VERSION "1.2"
  set_default DATABASE_URL "postgresql://localhost:5432/ci"
  set_default DATA_ENCRYPTION_KEY "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  set_default KEY_CUSTODIAN_1 "Custodiante A (CI)"
  set_default KEY_CUSTODIAN_2 "Custodiante B (CI)"
  set_default MAINTENANCE_SECRET "hooks-maintenance-secret-000000"
  set_default AUDIT_DATABASE_URL "postgresql://localhost:5432/audit"
  set_default BACKUP_LOCAL_DIR "/tmp/opencode/backups/local"
  set_default BACKUP_CLOUD_DIR "/tmp/opencode/backups/cloud"
  set_default BACKUP_CLOUD_REGION "br-sudeste"
  set_default BACKUP_CLOUD_MFA "true"
  set_default BACKUP_CLOUD_IMMUTABLE "true"
  set_default BACKUP_TEST_DATABASE_URL "postgresql://localhost:5432/audit_test"
  # A data de rotação é sempre "hoje" no CI, para não expirar com o tempo.
  set_default DATA_ENCRYPTION_KEY_ROTATED_AT "$(date -u +%Y-%m-%d)"
}

run_check() {
  check="$1"
  case "$check" in
    all)
      for c in format lint biome typecheck test build secrets dependencies env database fixtures governance; do
        echo "==> [checks] ${c}"
        run_check "$c"
      done
      ;;
    conventional-commits)
      if [ -z "${COMMIT_MSG_FILE:-}" ] && [ -z "${COMMIT_RANGE:-}" ]; then
        echo "erro: defina COMMIT_MSG_FILE (hook) ou COMMIT_RANGE (CI)." >&2
        exit 1
      fi
      node .github/scripts/validate-conventional-commits.js
      ;;
    format)
      run_pnpm format:check
      ;;
    lint)
      run_pnpm lint
      ;;
    biome)
      run_pnpm check
      ;;
    typecheck)
      run_pnpm typecheck
      ;;
    test)
      run_pnpm test:run
      ;;
    coverage)
      run_pnpm test:coverage
      ;;
    build)
      placeholder_env
      run_pnpm build
      ;;
    secrets)
      run_pnpm check:secrets
      ;;
    dependencies)
      run_pnpm audit --prod --audit-level high
      ;;
    env)
      placeholder_env
      run_pnpm check:env
      ;;
    database)
      run_pnpm exec prisma validate
      run_pnpm db:generate
      for migration_dir in prisma/migrations/*/; do
        [ -f "${migration_dir}migration.sql" ] || {
          echo "erro: migração sem migration.sql: ${migration_dir}" >&2
          exit 1
        }
      done
      echo "[checks] schema Prisma e migrações OK"
      ;;
    fixtures)
      run_pnpm exec tsx scripts/check-fixtures.ts
      ;;
    governance)
      run_pnpm exec tsx scripts/check-branch-protection.ts
      ;;
    *)
      echo "erro: check desconhecido '${check}'." >&2
      echo "Checks: conventional-commits format lint biome typecheck test coverage build secrets dependencies env database fixtures governance all" >&2
      exit 2
      ;;
  esac
}

# Executa diretamente apenas quando chamado como script (não quando sourced).
if [ "$(basename "$0")" = "checks.sh" ]; then
  [ "$#" -ge 1 ] || {
    echo "uso: sh .github/hooks/checks.sh <check>" >&2
    exit 2
  }
  run_check "$1"
fi
