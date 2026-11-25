# Git hooks versionados

Os hooks ficam **neste diretório** (versionados no repositório) e são ativados com:

```bash
pnpm hooks:install        # ou: sh .github/hooks/install.sh
pnpm hooks:uninstall      # volta a usar .git/hooks
```

O instalador apenas executa `git config core.hooksPath .github/hooks` e marca os
scripts como executáveis. Não há dependência externa (Husky/lint-staged).

## Fonte única dos comandos

**`.github/hooks/checks.sh`** contém todos os comandos. Os workflows do CI em
`.github/workflows/check-*.yml` chamam `sh .github/hooks/checks.sh <check>`, e os
hooks carregam o mesmo arquivo com `.` e chamam `run_check <check>`. Assim, o que
roda localmente é exatamente o que roda no GitHub Actions.

Para rodar um check isolado:

```bash
sh .github/hooks/checks.sh format
sh .github/hooks/checks.sh test
sh .github/hooks/checks.sh database
```

## Checks disponíveis

| Check                  | Comando                                                 | Workflow CI                      | Hook                           |
| ---------------------- | ------------------------------------------------------- | -------------------------------- | ------------------------------ |
| `conventional-commits` | `node .github/scripts/validate-conventional-commits.js` | `check-conventional-commits.yml` | `commit-msg`                   |
| `format`               | `pnpm format:check`                                     | `check-format.yml`               | `pre-commit` (via `biome`)     |
| `lint`                 | `pnpm lint`                                             | `check-lint.yml`                 | `pre-commit` (via `biome`)     |
| `biome`                | `pnpm check`                                            | `check-biome.yml`                | `pre-commit`                   |
| `typecheck`            | `pnpm typecheck`                                        | `check-typecheck.yml`            | `pre-commit`                   |
| `test`                 | `pnpm test:run`                                         | `check-tests.yml`                | `pre-push`                     |
| `coverage`             | `pnpm test:coverage`                                    | `check-coverage.yml`             | —                              |
| `build`                | `pnpm build`                                            | `check-build.yml`                | `pre-push`                     |
| `secrets`              | `pnpm check:secrets`                                    | `check-secrets.yml`              | `pre-commit`                   |
| `dependencies`         | `pnpm audit --prod --audit-level high`                  | `check-dependencies.yml`         | —                              |
| `env`                  | `pnpm check:env`                                        | `check-env.yml`                  | —                              |
| `database`             | `prisma validate` + `pnpm db:generate` + migrações      | `check-database.yml`             | `post-merge` / `post-checkout` |

## Hooks

| Hook            | O que roda                                         |
| --------------- | -------------------------------------------------- |
| `pre-commit`    | `biome`, `secrets`, `typecheck`                    |
| `commit-msg`    | valida Conventional Commits no arquivo de mensagem |
| `pre-push`      | `test`, `build`                                    |
| `post-merge`    | `pnpm db:generate` (se `node_modules` existir)     |
| `post-checkout` | `pnpm db:generate` (se `node_modules` existir)     |

## Atalhos e bypass

```bash
HOOK_SKIP_BUILD=1 git push          # pula o build no pre-push
git commit --no-verify              # emergência: pula pre-commit e commit-msg
git push --no-verify                # emergência: pula pre-push
```

> O uso de `--no-verify` é desaconselhado: o CI executa os mesmos checks e vai
> reprovar o PR. Prefira corrigir com `pnpm check:fix`.

## Formatação

Se o `pre-commit` reclamar de formatação:

```bash
pnpm check:fix
git add -A
git commit -m "fix: corrige formatação"
```

O `checks.sh` usa placeholders de ambiente apenas para `build`/`env` quando as
variáveis não estão definidas. Para validar uma instalação real de produção,
execute `pnpm check:env` com as variáveis verdadeiras do cofre.
