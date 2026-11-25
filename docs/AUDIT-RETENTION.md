# Retenção e manutenção da base de auditoria (seções 10.3, 10.7 e 10.9)

## Base separada

Em produção, `AUDIT_DATABASE_URL` deve apontar para um banco **distinto** do acadêmico. Aplicar `prisma/audit-database.sql` nessa instância. A aplicação:

- espelha cada registro e alerta na base isolada (`SeparateAuditStore`);
- lê logs e alertas pela base isolada quando configurada (`auditReader()`);
- nunca expõe método de update/delete de logs; triggers bloqueiam `UPDATE`, `DELETE` e `TRUNCATE`.

Recomenda-se conceder à aplicação apenas `INSERT` e `SELECT` nas tabelas de auditoria e reservar `UPDATE/DELETE` a nenhum perfil, inclusive Admin Master.

## Prazos de guarda

| Classe                     | Prazo                             | Ações consideradas                                  |
| -------------------------- | --------------------------------- | --------------------------------------------------- |
| Logs de acesso             | 1 ano                             | `LOGIN_*`, `LOGOUT`, `SESSION_EXPIRED`              |
| Logs de notas e matrículas | Mesmo prazo do registro acadêmico | `ACADEMIC_*`, `GRADE_*`, `GRADES_*`, `ENROLLMENT_*` |
| Registro de incidentes     | 5 anos                            | `INCIDENT_*`                                        |

`pnpm audit:retention` (ou `POST /api/maintenance/audit-retention` com `x-maintenance-secret`) emite um relatório de contagens por classe, sem ler o conteúdo dos registros; inclui também incidentes fechados há mais de 5 anos.

`pnpm policy:archive` gera o **plano de arquivamento** (10.7/10.9): comandos `ALTER TABLE ... DETACH PARTITION` por mês expirado, para a Infraestrutura mover partições para armazenamento frio. A rotina usa apenas o calendário — **nenhuma linha de log é lida ou alterada** — e grava `MAINTENANCE_INTERVENTION`. Cada intervenção (`audit-retention`, `expire-support`, `expire-backups`, `clock-check`, `archive`) grava trilha própria (10.9).

## Acesso excepcional

`SUPORTE_TECNICO` não tem permissão permanente. O acesso é concedido por `SupportAccessGrant` aprovado pelo Auditor, com no máximo 8 horas, escopo por módulo, revogação automática (`pnpm` script / `/api/maintenance/expire-support`) e log de cada consulta com alerta `SUPPORT_ACCESS_USED`. Investigações do próprio Auditor exigem documento de autorização da direção (10.8.4).
