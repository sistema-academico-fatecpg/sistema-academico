# Sistema Acadêmico

Aplicação Next.js 16 para gestão acadêmica com os controles da `Politica de Seguranca.md` (RBAC, dupla aprovação, MFA, auditoria isolada, LGPD, backups e resposta a incidentes).

## Desenvolvimento

```bash
pnpm install
pnpm db:generate
pnpm dev
```

`docker compose up -d --build` sobe o Postgres, cria os bancos isolados de
auditoria/backup (`prepare-databases`) e dispara o serviço `activation-mailer`:
aplica migrações, cria a massa de teste (4 Masters) e envia o link/código de
ativação para `TEST_EMAIL` pela Resend. Detalhes em `docs/TEST-DATA.md`.

Erros inesperados nas APIs são registrados no servidor com mensagem e stack
(sem segredos) e respondidos ao cliente apenas como `Erro interno`/`INTERNAL`.

Variáveis em `.env.example`. Qualidade local:

```bash
pnpm hooks:install   # instala os git hooks de .github/hooks (uma vez por clone)
pnpm check           # formatação + lint + imports
pnpm typecheck
pnpm test:run
pnpm build
pnpm verify          # todos os checks, na mesma ordem do CI
```

Os **comandos** vivem em `.github/hooks/checks.sh` e são compartilhados pelos
git hooks (`pre-commit`, `commit-msg`, `pre-push`, `post-merge`, `post-checkout`)
e pelos workflows do GitHub Actions (`.github/workflows/check-*.yml`). Cada check
tem seu próprio status check no PR. Detalhes: `.github/hooks/README.md`.

## Rotinas operacionais

| Comando | Finalidade |
| --- | --- |
| `pnpm bootstrap:master` | Cria a primeira conta Admin Master sem senha (8.1). |
| `pnpm close:grades` | Fecha períodos de notas e gera snapshot (9.2). |
| `pnpm expire:emergency` | Bloqueia Masters emergenciais expirados (8.8). |
| `pnpm audit:retention` | Relatório de retenção de logs (10.7). |
| `pnpm report:admin-access` | Relatório semestral de acessos administrativos (8.7.3). |
| `pnpm backup [full\|incremental\|closing]` | Cópia 3-2-1 criptografada (11.3). |
| `pnpm restore:test <id>` | Teste mensal de restauração em ambiente separado (11.3.4). |
| `pnpm restore <backup> <request> <ids...>` | Restauração parcial autorizada (13.3/13.4). |
| `pnpm backup:expire` | Arquivamento de cópias fora da retenção (10.7/11.3). |
| `pnpm data:eliminate <id> "<justificativa>"` | Eliminação ao fim do tratamento (11.1.6). |
| `pnpm key:rotate` | Rotação anual de chaves AES-256-GCM (11.2.4). |
| `pnpm check:secrets` | Varredura de segredos versionados (12.4). |
| `pnpm check:env` | Validação da configuração de produção (12.1/12.4/11.2/11.3). |
| `pnpm check:clock` | Deriva de relógio aplicação × banco / NTP (10.1). |
| `pnpm check:rotation` | Rotação anual da chave e custodiantes (11.2.4). |
| `pnpm check:media` | Mídia física de backup, 3 anos e desconexão (11.3.2). |
| `pnpm check:restore` | Teste mensal de restauração e RPO/RTO (11.3.4/11.3.5). |
| `pnpm policy:review` | Revisão anual da política (16). |
| `pnpm policy:archive` | Plano de arquivamento de logs sem ler conteúdo (10.7/10.9). |

## Estrutura de rotas

`app/(private)` = área autenticada (sidebar + guard), `app/(auth)` = login/ativação
(cartão centralizado), raiz = layout HTML e páginas públicas. Os parênteses são
*route groups*: não aparecem na URL. Detalhes em `docs/APP-STRUCTURE.md`.

## Documentação de conformidade

- `docs/APP-STRUCTURE.md` — por que `(private)`/`(auth)` existem e onde ficam os componentes.
- `docs/IMPLEMENTATION-STATUS.md` — matriz por seção da política.
- `docs/COMPLIANCE-REPORT.md` — relatório de desenvolvimento por requisito.
- `docs/RESPONSIBILITIES.md` — responsabilidades e revisão anual.
- `docs/KEY-MANAGEMENT.md`, `docs/BACKUP-AND-RESTORE.md`, `docs/INCIDENT-RESPONSE.md`, `docs/AUDIT-RETENTION.md`, `docs/SECURE-DEVELOPMENT.md`.

> Antes de declarar conformidade, aplicar as migrações, configurar `AUDIT_DATABASE_URL` com `prisma/audit-database.sql` e agendar as rotinas acima em ambiente real.
