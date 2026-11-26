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

## Segunda auditoria (PR de fechamento de lacunas)

A matriz acima foi revisitada contra o código, não apenas contra ela mesma. Lacunas encontradas e fechadas:

| Requisito                    | Lacuna                                                                                                                           | Correção                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1/7.2/7.5.4/10.2/10.6      | `Role.name` era enum: impossível criar perfil novo; alteração de permissões não existia; `PERMISSIONS_CHANGED` nunca era emitido | `Role.name` virou `String`; `POST /api/roles` cria perfil vazio; `POST /api/roles/[id]/permissions` gera solicitação crítica; executor emite `PERMISSIONS_CHANGED`/`ROLE_ASSIGNED`/`ROLE_REMOVED` |
| 7.3/9.2.3/9.3.1              | `/api/users/[id]` permitia que ALUNO/PROFESSOR lesse dados pessoais de qualquer usuário trocando o id na URL                     | `assertCanAccessUser` com `visibleRolesFor` e exceção para próprio titular                                                                                                                        |
| 8.6.2                        | `identityVerifiedAt` era opcional                                                                                                | obrigatório na rota e validado na aprovação                                                                                                                                                       |
| 8.7.3                        | relatório semestral inexistente                                                                                                  | `adminAccessReport`, `/api/reports/admin-access`, `pnpm report:admin-access`                                                                                                                      |
| 8.8 (tabela)                 | `replaceUserId` nunca usado; conta anterior não era bloqueada após ativação                                                      | `users.replacesUserId` + bloqueio em `AccountService.activate`                                                                                                                                    |
| 8.8.4                        | autorização da direção só era exigida na contingência, não em conta única                                                        | exigida também em modo de conta única                                                                                                                                                             |
| 8.8 (5 dias úteis / revisão) | sem prazo e sem revisão das ações emergenciais                                                                                   | `directionDeadline`/`directionDeadlineOverdue` em `masterStatus`; `POST /api/master/emergency-review`                                                                                             |
| 8.4.2/8.9                    | limite de tentativas do 2º fator não configurado explicitamente                                                                  | `accountLockout` 5/15min; consumo do código de recuperação na trilha da aplicação                                                                                                                 |
| 10.4                         | filtro por usuário faltava na tela                                                                                               | campo `userId`                                                                                                                                                                                    |
| 10.9                         | intervenções de manutenção sem trilha própria                                                                                    | `MAINTENANCE_INTERVENTION` nas rotinas                                                                                                                                                            |
| 11.1.2                       | mascaramento usava o id do registro em vez do valor                                                                              | descriptografa e mascara o próprio valor                                                                                                                                                          |
| 11.1.3                       | sem data de nascimento nem exigência de consentimento para menores                                                               | `birthDate` + bloqueio ao armazenar dado sensível de menor sem consentimento                                                                                                                      |
| 11.1.6                       | eliminação só por decisão manual de pedido                                                                                       | `DataSubjectService.eliminate` + `pnpm data:eliminate`                                                                                                                                            |
| 12.3                         | sem cabeçalhos de segurança explícitos                                                                                           | `next.config.ts` com CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy                                                                                                                         |
| 13.2                         | análise não verificava se a cópia era anterior ao incidente nem se fora testada em ambiente separado                             | `analyze` exige `createdAt < reportedAt` e `restoreTestAt`; `restoreTest` exige `BACKUP_TEST_DATABASE_URL`; solicitação só por Admin Master                                                       |
| 13.3                         | lançamentos legítimos posteriores não eram identificados                                                                         | `partialRestore` devolve `replayCandidates` dos logs                                                                                                                                              |
| 13 (3 dias úteis / 5 anos)   | prazo e guarda apenas documentados                                                                                               | `notify` calcula prazo, registra atraso; `auditRetentionReport` conta incidentes fora do prazo                                                                                                    |

### Itens que permanecem operacionais (fora do código da aplicação)

- 10.1 NTP, 11.2.1 TLS efetivo, 11.3.2 guarda física do HD e 11.3.3 contrato de nuvem continuam sendo **execução** da Infraestrutura — mas deixaram de ser apenas texto: há `pnpm check:clock`, `check:env` (HTTPS/TLS/cofre/nuvem), `check:media`, `check:rotation` e `check:restore`, alertas automáticos e trilha de manutenção que verificam cada configuração.
- 11.3.5 RTO 8h é meta de processo; `/api/backups/status` reporta RPO, último teste e atraso.
- 12.1/12.2/12.5/12.6: `check:env`, `check-fixtures`, `CODEOWNERS` + `check-branch-protection`, `pnpm audit` e `dependabot.yml`.
- 13: candidatos a relançamento identificados nos logs; relançamento supervisionado pelo Auditor.
- 14/15/16: tela `/responsabilidades`, `policy_reviews`, `policy_violations` e alertas de revisão vencida.

## Terceira auditoria (conclusão)

| Item antes pendente              | Mecanismo agora presente                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 7.3 em páginas `(private)`       | `requirePagePermission`/`actor.permissions` em todas as telas com dados; `/suporte` filtra por solicitante            |
| 8.1.2 três Masters recomendados  | `recommendedMasters`/`belowRecommendation` em `masterStatus` + aviso na tela                                          |
| 8.4.2 código TOTP aceito uma vez | `app/lib/auth/totp-single-use.ts`: hook `before` com reserva atômica em `totp_used_codes`                             |
| 8.9 justificativas NIST          | `docs/PASSWORD-POLICY.md`                                                                                             |
| 10.1 NTP                         | `clockDriftReport` + `/api/maintenance/clock-check` + `pnpm check:clock`                                              |
| 10.2 exceções de matrícula       | `ENROLLMENT_EXCEPTION_REQUESTED` emitido na rota de exceção                                                           |
| 10.7/10.9 arquivamento           | `pnpm policy:archive` gera plano de `DETACH PARTITION` sem ler conteúdo                                               |
| 11.2.1/11.2.4/11.3.3             | `check:env` exige HTTPS/TLS, rotação anual, 2 custodiantes, MFA/imutabilidade da nuvem e autorização de transferência |
| 11.3.2/11.3.4                    | `backup_media` + `check:media`; `restoreTestOverdue` em `/api/backups/status` + `check:restore`                       |
| 12.1/12.2/12.5/12.6              | `APP_ENV`/`DEV_TEAM_PRODUCTION_ACCESS`, `check-fixtures`, `CODEOWNERS`, `check-branch-protection`, `dependabot.yml`   |
| 13 risco relevante               | alerta `DPO_NOTIFICATION_DUE` + `dpoDeadline` em `/api/incidents`                                                     |
| 15 descumprimento                | `policy_violations` + `/api/compliance/violations` + bloqueio de conta                                                |
| 16 revisão anual                 | `policy_reviews` + `/api/compliance/policy-review` + alerta `POLICY_REVIEW_OVERDUE`                                   |
| 14 responsabilidades             | tela `/responsabilidades`                                                                                             |
