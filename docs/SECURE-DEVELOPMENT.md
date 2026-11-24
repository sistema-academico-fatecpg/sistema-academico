# Regras para o desenvolvimento (12)

| Requisito                        | Implementação                                                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.1 ambientes separados         | `NODE_ENV`, `DATABASE_URL` e `AUDIT_DATABASE_URL` distintos por ambiente; `pnpm check:env` falha cedo em produção. Desenvolvedores não têm credencial de produção (7.4).      |
| 12.2 dados fictícios             | Seeds e testes usam apenas dados sintéticos; nenhum dump real é versionado.                                                                                                   |
| 12.3 OWASP                       | Prisma com consultas parametrizadas, validação Zod em todas as entradas, saída escapada pelo React, cookies `HttpOnly`/`SameSite`, autorização server-side a cada requisição. |
| 12.4 sem segredos no repositório | `.env.example` sem valores reais; `pnpm check:secrets` varre arquivos versionados; job `security` no CI.                                                                      |
| 12.5 code review                 | Entrega por PRs com CI obrigatório; nenhum push direto na branch protegida.                                                                                                   |
| 12.6 dependências                | `pnpm audit --prod --audit-level high` no job `security`; atualizações acompanhadas pelo lockfile.                                                                            |
| 12.7 erros genéricos             | `jsonError` mapeia erros sem expor stack ou detalhes internos; login usa mensagem única.                                                                                      |

O CI (`ci.yml`) executa Conventional Commits, Biome, typecheck, testes, build de produção, secret scan e auditoria de dependências.
