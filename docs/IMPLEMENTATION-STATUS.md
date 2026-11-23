# Matriz de implementação da Política de Segurança da Informação

> Esta matriz separa o que existe no código do que ainda precisa de validação técnica. A existência de uma rota ou modelo não comprova, isoladamente, o cumprimento do requisito.

| Requisito | Estado após esta revisão | Evidência / pendência |
|---|---|---|
| 7.1–7.4 RBAC e negação por padrão | Parcial | Modelos Role, Permission e RolePermission existem; ainda é necessário migrar todas as rotas para autorização Better Auth + permissões do banco. |
| 7.5–7.6 dupla aprovação | Parcial | Modelo e fluxo de solicitações existem; falta garantir execução transacional por tipo de operação e impedir execução arbitrária. |
| 8.1 bootstrap Master sem senha | Parcial | Script e endpoint de bootstrap existem; validar operação com e-mail institucional, documento de autorização e contingência. |
| 8.2 cadastro sem senha/autocadastro | Parcial | Formulário administrativo existe; rotas legadas e endpoints devem ser revisados para impedir autocadastro. |
| 8.3 ativação, senha e códigos | Parcial | Tokens, política de senha e MFA existem; validar código de confirmação de e-mail de 10 min e exposição única dos dez recovery codes. |
| 8.4 MFA, bloqueio e mensagens | Parcial | Better Auth/TOTP e campos de bloqueio existem; validar limite de cinco tentativas/15 min, uso único TOTP e alertas. |
| 8.5 inatividade | Implementado na sessão | Sessão revalidada no servidor com 15/30 min. |
| 8.6 recuperação | Parcial | Fluxo de token existe; validar 30 min, uso único e procedimento presencial para reset MFA. |
| 8.7 bloqueio e exclusão lógica | Parcial | Status e rotas de bloqueio/desativação existem; revisar revogação de todas as sessões e tokens em todas as rotas. |
| 8.8 contingência Master | Parcial | Campos e enumerações existem; faltam fluxos completos de conta única, prazo de cinco dias, autorização formal e expiração emergencial. |
| 9.1 matrícula e DP | Parcial | Entidades existem; implementar/validar seleção obrigatória de DP e conflitos de horário no servidor. |
| 9.2 notas e fechamento | Parcial | Períodos, notas e histórico existem; falta job confiável de fechamento, snapshot/backup e aprovação de correções pós-fechamento. |
| 9.3 consulta do aluno | Pendente de validação | Toda consulta deve derivar studentId da sessão, nunca de query/body. |
| 9.4 exportação | Parcial | Permissões existem; implementar exportação auditada e dupla aprovação para exportação em massa. |
| 10 auditoria separada e imutável | Não concluído | Atualmente Log/AuditAlert estão no banco acadêmico. A política exige banco separado. Criar cliente e conexão independentes antes de declarar conformidade. |
| 11 backup e recuperação | Parcial | Docker/Postgres existe; implementar rotina criptografada, testes, RPO 24h, RTO 8h e aprovação de restauração. |
| 12 desenvolvimento seguro | Parcial | CI, Zod, testes e Docker existem; validar ambientes separados, code review obrigatório, secret scanning e dependências. |
| 13 incidentes | Parcial | Alertas existem; implementar workflow de incidente, bloqueio, preservação de evidências, aprovação e restauração parcial. |

## Decisões de segurança

- Better Auth é a única autoridade de sessão para novas funcionalidades.
- Não adicionar novos usos de JWT manual.
- O servidor deve autorizar cada operação e filtrar os registros por vínculo acadêmico.
- Ocultar controles na interface é apenas UX, nunca autorização.
- Não executar operações críticas com payload livre enviado pelo cliente.
- Logs não podem ser alterados ou apagados pela aplicação.
- Não declarar conformidade enquanto auditoria independente e fluxos pendentes não forem validados.
