# Responsabilidades (14) e vigência (16)

| Responsável                | Atribuições no sistema                                                                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin Master               | Gerencia perfis e permissões (`/api/roles`, `/api/roles/[id]/permissions`), define janelas de notas (`/api/periods`), aprova operações críticas (`/aprovacoes`) e revisa o relatório semestral (`/api/reports/admin-access`, `pnpm report:admin-access`). |
| Admin Secundário           | Cadastra alunos/professores sem senha, bloqueia desligados, registra consentimento de responsável e solicita exceções/correções.                                                                                                                          |
| Direção / RH               | Comunica desligamentos e autoriza formalmente inclusão de Master em conta única/contingência e restaurações que envolvam Admin Master (campo `authorizationDocument`).                                                                                    |
| Professor                  | Lança notas apenas das suas turmas, dentro da janela; solicita correção pós-fechamento.                                                                                                                                                                   |
| Aluno                      | Consulta seus dados pela sessão, matricula-se com DP primeiro, exerce direitos LGPD em `/api/data-subject/*`.                                                                                                                                             |
| Auditor                    | Consulta base isolada de logs, reconhece alertas, aprova acessos de suporte, restaurações e inclusões de Master em contingência.                                                                                                                          |
| Equipe de Desenvolvimento  | Implementa a política, mantém CI/testes e entrega este relatório; sem acesso ao ambiente produtivo.                                                                                                                                                       |
| Equipe de Infraestrutura   | Executa bootstrap/contingência, backups 3-2-1, testes de restauração, custodia chaves no cofre e mantém servidores/NTP.                                                                                                                                   |
| Encarregado de Dados (DPO) | Atende titulares, decide notificações à ANPD e titulares em até 3 dias úteis, guarda incidentes por 5 anos.                                                                                                                                               |

## Descumprimento (15)

`/api/compliance/violations` registra regra violada, descrição e sanção
(`ADVERTENCIA`, `BLOQUEIO`, `MEDIDA_DISCIPLINAR`). `BLOQUEIO` bloqueia a conta,
revoga sessões e grava `POLICY_VIOLATION_RECORDED` em log.

## Vigência e revisão (16)

A política entra em vigor na aprovação e deve ser revisada **anualmente** ou após incidente relevante/alteração legal. Mecanismo: tabela `policy_reviews`, `POST /api/compliance/policy-review` (registra revisão e `nextReviewAt`), `GET` com `overdue`, `pnpm policy:review` / tela `/responsabilidades`, e alerta `POLICY_REVIEW_OVERDUE` quando há atraso ou incidente HIGH/CRITICAL desde a última revisão. `docs/COMPLIANCE-REPORT.md` e `docs/IMPLEMENTATION-STATUS.md` são os artefatos de evidência; cada mudança de requisito deve gerar nova issue e novo PR.
