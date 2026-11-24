# Sistema Acadêmico — FATECPG

Aplicação Next.js 16 para gestão acadêmica com os controles da `Politica de Seguranca.md` (RBAC, dupla aprovação, MFA, auditoria isolada, LGPD, backups e resposta a incidentes).

## Desenvolvimento

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Variáveis em `.env.example`. Qualidade local:

```bash
pnpm check
pnpm typecheck
pnpm test:run
pnpm build
```

## Rotinas operacionais

| Comando | Finalidade |
| --- | --- |
| `pnpm bootstrap:master` | Cria a primeira conta Admin Master sem senha (8.1). |
| `pnpm close:grades` | Fecha períodos de notas e gera snapshot (9.2). |
| `pnpm expire:emergency` | Bloqueia Masters emergenciais expirados (8.8). |
| `pnpm audit:retention` | Relatório de retenção de logs (10.7). |
| `pnpm backup [full\|incremental\|closing]` | Cópia 3-2-1 criptografada (11.3). |
| `pnpm restore:test <id>` | Teste mensal de restauração (11.3.4). |
| `pnpm restore <backup> <request> <ids...>` | Restauração parcial autorizada (13.3/13.4). |
| `pnpm key:rotate` | Rotação anual de chaves AES-256-GCM (11.2.4). |
| `pnpm check:secrets` | Varredura de segredos versionados (12.4). |
| `pnpm check:env` | Validação da configuração de produção (12.1/12.4). |

## Documentação de conformidade

- `docs/IMPLEMENTATION-STATUS.md` — matriz por seção da política.
- `docs/COMPLIANCE-REPORT.md` — relatório de desenvolvimento por requisito.
- `docs/RESPONSIBILITIES.md` — responsabilidades e revisão anual.
- `docs/KEY-MANAGEMENT.md`, `docs/BACKUP-AND-RESTORE.md`, `docs/INCIDENT-RESPONSE.md`, `docs/AUDIT-RETENTION.md`, `docs/SECURE-DEVELOPMENT.md`.

> Antes de declarar conformidade, aplicar as migrações, configurar `AUDIT_DATABASE_URL` com `prisma/audit-database.sql` e agendar as rotinas acima em ambiente real.
