# .github — CI e hooks

Estrutura:

```
.github/
├── hooks/
│   ├── checks.sh                # ⬅ FONTE ÚNICA dos comandos de todos os checks
│   ├── pre-commit               # biome, secrets, typecheck
│   ├── commit-msg               # Conventional Commits
│   ├── pre-push                 # testes + build
│   ├── post-merge               # prisma generate
│   ├── post-checkout            # prisma generate
│   ├── install.sh               # git config core.hooksPath .github/hooks
│   ├── uninstall.sh
│   └── README.md
├── scripts/
│   └── validate-conventional-commits.js   # 2 modos: COMMIT_MSG_FILE / COMMIT_RANGE
└── workflows/
    ├── ci.yml                   # orquestrador: 1 job reutilizável por check
    └── check-*.yml              # 14 workflows reutilizáveis, 1 por check
```

## Checks

| Status check no PR   | Comando (via `checks.sh`)                               |
| -------------------- | ------------------------------------------------------- |
| Conventional Commits | `node .github/scripts/validate-conventional-commits.js` |
| Format               | `pnpm format:check`                                     |
| Lint                 | `pnpm lint`                                             |
| Biome check          | `pnpm check`                                            |
| Typecheck            | `pnpm typecheck`                                        |
| Tests                | `pnpm test:run`                                         |
| Coverage             | `pnpm test:coverage`                                    |
| Build                | `pnpm build`                                            |
| Secret scan          | `pnpm check:secrets`                                    |
| Dependency audit     | `pnpm audit --prod --audit-level high`                  |
| Production env       | `pnpm check:env`                                        |
| Prisma schema        | `prisma validate` + `pnpm db:generate` + migrações      |
| Fixtures (12.2)      | `tsx scripts/check-fixtures.ts`                         |
| Governance (12.5)    | `tsx scripts/check-branch-protection.ts`                |

## Uso

```bash
pnpm hooks:install          # instala os hooks (uma vez por clone)
pnpm verify                 # roda todos os checks localmente, igual ao CI
sh .github/hooks/checks.sh format    # um check isolado
```

Os workflows `check-*.yml` e os hooks chamam **o mesmo** `checks.sh`; alterar um
comando ali altera CI e hooks juntos. O setup (checkout + Node 22 + pnpm 12 +
deps + Prisma) fica inline em cada `check-*.yml`: workflows reutilizáveis não
conseguem resolver actions locais (`./`), pois o checkout do repositório só
acontece na execução dos passos, depois da preparação do job.

O CI roda em PRs/pushes, semanalmente (`schedule`) e manualmente
(`workflow_dispatch`). Todos os checks do CI são somente-leitura — a formatação
é garantida pelo `pre-commit`.
