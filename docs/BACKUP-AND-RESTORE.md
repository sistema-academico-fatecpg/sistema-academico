# Cópias de segurança e restauração (11.3 e 13.2–13.4)

## Regra 3-2-1

`pnpm backup [full|incremental|closing]` (ou `POST /api/maintenance/backup` com `x-maintenance-secret`) gera três cópias: banco de produção + arquivo em `BACKUP_LOCAL_DIR` (HD desconectado da rede após a cópia) + arquivo em `BACKUP_CLOUD_DIR` (nuvem exclusiva, com MFA e imutabilidade até o fim da retenção). O arquivo é **gzip + AES-256-GCM antes de sair do servidor**; `iv`/`authTag` e checksum SHA-256 ficam em `backup_records`.

| Tipo               | Frequência                      | Retenção |
| ------------------ | ------------------------------- | -------- |
| `FULL`             | Semanal (domingo)               | 12 meses |
| `INCREMENTAL`      | Diário, fora do horário de aula | 30 dias  |
| `SEMESTER_CLOSING` | Fim de semestre                 | 5 anos   |

Metas: **RPO 24h** e **RTO 8h**. O HD é substituído a cada 3 anos ou ao primeiro sinal de falha. Se o provedor de nuvem armazenar dados fora do Brasil, observar LGPD art. 33.

## Testes e restauração

- `pnpm restore:test <backup-id>` descriptografa, valida checksum e estrutura em ambiente separado, marcando `RESTORE_TESTED` e `restoreTestAt` (teste mensal, 11.3.4).
- Restauração **nunca é automática**. O fluxo de incidente (13.2) exige análise técnica, verificação de integridade e uma `DATA_RESTORE_AFTER_INCIDENT` com status `EXECUTED`, aprovada pelo Auditor (ou pela direção, se o incidente envolver Admin Master).
- `pnpm restore <backup-id> <request-id> <record-id...>`:
  1. exige a solicitação aprovada/executada;
  2. guarda uma cópia do estado atual (`INCREMENTAL` "pre-restore", 13.3);
  3. restaura **apenas os registros afetados** (notas/matrículas), não a base inteira (13.4);
  4. lançamentos legítimos posteriores são identificados pelos logs e relançados manualmente com supervisão do Auditor.
- `GET /api/backups` e `POST /api/backups/[id]/verify` permitem acompanhamento pelo Admin Master/Auditor.
