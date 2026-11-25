# Relatório de desenvolvimento — Política de Segurança da Informação

> Escopo: exclusivamente `Politica de Seguranca.md`. Cada requisito abaixo foi entregue pelos PRs #49–#54 e pelo PR de fechamento de lacunas da segunda auditoria (documento × código). A validação técnica em ambiente com banco real continua necessária antes de declaração formal de conformidade.

| Seção     | Requisito                                                                                                                | Onde está implementado                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 7.1–7.4   | RBAC, permissões por perfil, autorização no servidor, sem credencial de dev em produção                                  | `app/lib/auth/session.ts`, `app/types/roles.ts`, `prisma/seed.ts`, `app/lib/security/maintenance.ts`                 |
| 7.5–7.6   | Dupla aprovação, autoaprovação bloqueada, justificativa, handlers transacionais                                          | `app/lib/critical-operations/*`, `/aprovacoes`, `/api/critical-operations`                                           |
| 8.1–8.3   | Bootstrap sem senha, cadastro sem senha, ativação 24h/código 10min, Argon2id, política de senha, 10 códigos              | `app/lib/auth/*`, `/api/auth/*`, `/configurar-2fa`                                                                   |
| 8.4–8.5   | TOTP obrigatório, bloqueio 5/15, erro genérico, inatividade 15/30                                                        | `better-auth.ts`, `login-service.ts`, `session.ts`                                                                   |
| 8.6–8.7   | Recuperação 30min, reset MFA aprovado, bloqueio com revogação, exclusão lógica                                           | `account-service.ts`, `/api/users/[id]/mfa-reset`, `/api/users/[id]/block`                                           |
| 8.8       | Conta única, Auditor como 2º aprovador, emergencial 30 dias, autorização da direção, logs marcados                       | `critical-operations/service.ts`, `/api/bootstrap/master/emergency`, `emergency-service.ts`, migração `is_emergency` |
| 9.1       | DP primeiro, período do aluno, conflito de horário, exceção aprovada                                                     | `app/lib/academic/rules.ts`, `enrollment-service.ts`, `/api/enrollments/*`                                           |
| 9.2       | Janela no servidor, vínculo professor, dados mínimos, histórico, fechamento/snapshot, correção aprovada                  | `grade-service.ts`, `grade-closing-service.ts`, `/api/grades/*`                                                      |
| 9.3       | studentId da sessão                                                                                                      | `/api/enrollments/me`, `/api/grades`, telas                                                                          |
| 9.4       | Exportação auditada e massa com dupla aprovação                                                                          | `export-service.ts`, `/api/exports`                                                                                  |
| 10.1–10.6 | Campos do log, eventos, base separada append-only, tela/filtros/exportação, redação, alertas                             | `app/lib/audit/*`, `prisma/audit-database.sql`, `/auditoria`                                                         |
| 10.7–10.9 | Retenção 1 ano / prazo acadêmico / 5 anos, manutenção sem leitura                                                        | `retention-service.ts`, `docs/AUDIT-RETENTION.md`, `pnpm audit:retention`                                            |
| 10.8      | Suporte sem permissão permanente, 8h, escopo, revogação, direção                                                         | `support-access-service.ts`, `/suporte`, `/api/support/access`                                                       |
| 11.1      | Minimização, dado sensível mascarado/criptografado, consentimento, direitos do titular, aviso de privacidade, eliminação | `sensitive-data-service.ts`, `data-subject-service.ts`, `/privacidade`, `/api/data-subject/*`                        |
| 11.2      | AES-256-GCM, cofre, rotação, TLS                                                                                         | `crypto.ts`, `docs/KEY-MANAGEMENT.md`, `pnpm key:rotate`                                                             |
| 11.3      | 3-2-1, criptografia, retenção, teste mensal, RPO/RTO                                                                     | `backup-service.ts`, `scripts/backup.ts`, `docs/BACKUP-AND-RESTORE.md`                                               |
| 12        | Ambientes, dados fictícios, OWASP, segredos, code review, dependências, erros                                            | `docs/SECURE-DEVELOPMENT.md`, `.github/workflows/ci.yml`, `scripts/check-secrets.ts`                                 |
| 13        | Comunicação, contenção, análise, restauração condicionada/parcial, notificação, 5 anos                                   | `incident-service.ts`, `/api/incidents`, `docs/INCIDENT-RESPONSE.md`                                                 |
| 14        | Responsabilidades                                                                                                        | `docs/RESPONSIBILITIES.md`                                                                                           |
| 15        | Descumprimento                                                                                                           | Registrado na política; bloqueio/desativação em `account-service.ts`                                                 |
| 16        | Vigência e revisão anual                                                                                                 | `docs/RESPONSIBILITIES.md`                                                                                           |

## Pendências de validação técnica (não bloqueiam o código)

1. Aplicar todas as migrações em banco PostgreSQL real e executar `prisma/audit-database.sql` na instância isolada.
2. Configurar `AUDIT_DATABASE_URL`, `DATA_ENCRYPTION_KEY`, `MAINTENANCE_SECRET`, `BACKUP_LOCAL_DIR`, `BACKUP_CLOUD_DIR` e `BACKUP_TEST_DATABASE_URL` no cofre.
3. Agendar `pnpm backup`, `pnpm restore:test`, `pnpm close:grades`, `pnpm expire:emergency`, `pnpm audit:retention`, `pnpm report:admin-access` e `pnpm backup:expire`.
4. Configurar TLS 1.2+, HD desconectado e nuvem imutável com MFA na Infraestrutura (11.2.1/11.3.2/11.3.3).
5. Revisar anualmente a matriz e reabrir issues a cada mudança legal ou incidente relevante.

## Segunda auditoria (PR de fechamento de lacunas)

`docs/IMPLEMENTATION-STATUS.md` registra, requisito a requisito, as lacunas encontradas após os PRs #49–#54 e suas correções: criação de perfis e gestão de permissões com dupla aprovação, autorização por vínculo em `/api/users/[id]`, relatório semestral, substituição de coordenador, prazo de 5 dias úteis e revisão de ações emergenciais, consentimento de menores, mascaramento real, cabeçalhos de segurança, condições de restauração (cópia anterior e testada), prazo de notificação e candidatos a relançamento. Permanecem apenas itens de infraestrutura/processo listados explicitamente na matriz.
