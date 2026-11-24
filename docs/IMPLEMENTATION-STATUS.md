# Matriz de implementação da Política de Segurança da Informação

> Esta matriz separa o que existe no código do que ainda precisa de validação técnica. A existência de uma rota ou modelo não comprova, isoladamente, o cumprimento do requisito. Relatório completo: `docs/COMPLIANCE-REPORT.md`.

| Requisito                                          | Estado após esta revisão | Evidência / pendência                                                                                                                                                                                                                     |
| -------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1–7.4 RBAC e negação por padrão                  | Implementado             | Permissões por perfil no banco, autorização server-side em cada rota, sem autocadastro e sem credencial de desenvolvimento em produção.                                                                                                   |
| 7.5–7.6 dupla aprovação                            | Implementado             | Serviço de operações críticas com permissão para solicitar, bloqueio de autoaprovação, justificativa obrigatória, handlers fechados por tipo e execução transacional na aprovação; tela `/aprovacoes` e rotas `/api/critical-operations`. |
| 8.1–8.8 ciclo de vida e contingência               | Implementado             | Bootstrap, ativação, Argon2id, TOTP/códigos, bloqueio/revogação, conta única e conta emergencial de 30 dias com autorização da direção e ações marcadas nos logs.                                                                         |
| 9.1–9.4 módulos acadêmicos                         | Implementado             | DP obrigatória e conflito no servidor, janela de notas, vínculo do professor, histórico, fechamento com snapshot, consulta pela sessão e exportação com dupla aprovação para massa.                                                       |
| 10.1–10.9 auditoria                                | Implementado             | Base isolada append-only (`AUDIT_DATABASE_URL`), tela/API do Auditor, alertas, retenção documentada e acesso de suporte com 8h/escopo/revogação automática.                                                                               |
| 11.1 LGPD                                          | Implementado             | Dados sensíveis AES-256-GCM e mascarados, consentimento do responsável, direitos de acesso/correção/cópia/eliminação e aviso de privacidade com contato do DPO.                                                                           |
| 11.2 criptografia e chaves                         | Implementado             | AES-256-GCM, cofre via env, rotação com chave anterior e `docs/KEY-MANAGEMENT.md`.                                                                                                                                                        |
| 11.3 backups 3-2-1                                 | Implementado             | Rotina criptografada em dois destinos, retenção por tipo, teste de restauração, RPO 24h/RTO 8h e `docs/BACKUP-AND-RESTORE.md`.                                                                                                            |
| 12 desenvolvimento seguro                          | Implementado             | CI com Biome, typecheck, testes, build, secret scan e auditoria de dependências; `docs/SECURE-DEVELOPMENT.md`.                                                                                                                            |
| 13 resposta a incidentes                           | Implementado             | Workflow com contenção, análise, autorização de restauração, restauração parcial, notificação em 3 dias úteis e guarda de 5 anos; `docs/INCIDENT-RESPONSE.md`.                                                                            |
| 14–16 responsabilidades, descumprimento e vigência | Implementado             | `docs/RESPONSIBILITIES.md` e revisão anual registrada.                                                                                                                                                                                    |

## Decisões de segurança

- Better Auth é a única autoridade de sessão para novas funcionalidades.
- Não adicionar novos usos de JWT manual.
- O servidor deve autorizar cada operação e filtrar os registros por vínculo acadêmico.
- Ocultar controles na interface é apenas UX, nunca autorização.
- Não executar operações críticas com payload livre enviado pelo cliente.
- Logs não podem ser alterados ou apagados pela aplicação.
- Não declarar conformidade enquanto a validação técnica em ambiente real não for concluída.
