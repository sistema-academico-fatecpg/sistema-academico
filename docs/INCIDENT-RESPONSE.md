# Resposta a incidentes (13)

Fluxo implementado em `IncidentService` e `/api/incidents`:

1. **Comunica** — `POST /api/incidents` registra título, descrição, severidade e autorização da direção quando há Admin Master envolvido; gera log `INCIDENT_REPORTED` e alerta ao Auditor.
2. **Contém** — `POST /api/incidents/:id/contain` bloqueia imediatamente a conta envolvida (revoga sessões e links), preserva evidências em `evidence` e marca `CONTAINED`.
3. **Analisa** — `POST /api/incidents/:id/analyze` exige relatório técnico, `integrityVerified: true`, verificação do checksum do backup e lista de registros afetados; marca `ANALYZED`.
4. **Decide** — `POST /api/incidents/:id/restore` cria `DATA_RESTORE_AFTER_INCIDENT`; aprovação do Auditor via `/api/critical-operations/:id/decision` (com `x-direction-authorization` quando envolve Master).
5. **Corrige** — `pnpm restore` executa restauração parcial após `EXECUTED`, com cópia do estado atual.
6. **Notifica** — `POST /api/incidents/:id/notify` registra comunicação à ANPD e aos titulares em até **3 dias úteis** (LGPD art. 48 / Resolução CD/ANPD 15/2024).
7. **Registra** — `POST /api/incidents/:id/close`; o registro do incidente é guardado por **5 anos**.

Responsabilidade do Encarregado de Dados: avaliar risco/dano relevante e conduzir as notificações. O sistema fornece os registros e prazos, não substitui a decisão do DPO.
