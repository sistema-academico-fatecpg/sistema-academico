# Massa de teste

## Como gerar

```bash
# 1) coloque seu e-mail em TEST_EMAIL no .env (opcional)
# 2) aplique as migrações e o seed de papéis
pnpm db:deploy
pnpm db:seed

# 3) crie a massa de teste
pnpm db:seed:test
```

O script é **idempotente**: pode ser executado várias vezes sem duplicar registros
(usa `upsert` por chave natural e verificações antes de criar históricos).

## O que é criado

| Perfil             | Usuário                                  | Observação                                   |
| ------------------ | ---------------------------------------- | -------------------------------------------- |
| `ADMIN_MASTER`     | `TEST_EMAIL` (ou `coord@fatecpg.edu.br`) | seu usuário, sem senha                       |
| `ADMIN_MASTER`     | `coord2@fatecpg.edu.br`                  | vice-coordenação                             |
| `ADMIN_MASTER`     | `coord3@fatecpg.edu.br`                  | terceiro Master (8.1.2)                      |
| `ADMIN_SECUNDARIO` | `sec1@fatecpg.edu.br`                    | secretaria                                   |
| `PROFESSOR`        | `prof1@fatecpg.edu.br`                   | vinculado às 3 turmas                        |
| `ALUNO`            | `aluno1@fatecpg.edu.br`                  | matrículas + nota                            |
| `ALUNO`            | `aluno2@fatecpg.edu.br`                  | menor, com DP e consentimento do responsável |
| `AUDITOR`          | `auditor1@fatecpg.edu.br`                | revisa logs e incidentes                     |
| `SUPORTE_TECNICO`  | `infra1@fatecpg.edu.br`                  | concessão pendente e expirada                |

Além dos usuários: 1 curso (`CC`), 1 período vigente (2026/2), 3 disciplinas e
turmas com horários, matrículas, uma dependência (DP), nota com histórico,
operações crítica pendente/executada, concessões de suporte, logs e alertas,
dado sensível criptografado (se `DATA_ENCRYPTION_KEY` estiver definida), pedido
LGPD, incidente HIGH, revisão de política em dia, backup e mídia física.

## Ativação (sem e-mail em desenvolvimento)

**Nenhuma senha é criada pelo seed** (seção 8.2). O script grava os links de
ativação e os códigos de confirmação de 6 dígitos em:

```
${TEST_DATA_OUTPUT_DIR:-/tmp/opencode}/test-data-activation.json
```

Arquivo criado com permissão `0600`. Abra o arquivo, copie a URL de ativação do
seu e-mail (`TEST_EMAIL`), acesse-a no navegador, informe o código de 6 dígitos
correspondente e crie sua senha (mínimo 12 caracteres com maiúscula, minúscula,
número e especial). Cada link é de uso único e expira em 24 h.

> Os links **não** aparecem no console nem em logs: a política 10.5 proíbe
> gravar tokens/códigos em log. O arquivo local é a única cópia em dev.

## E-mails

Em desenvolvimento, sem `RESEND_API_KEY`, o transporte é `ConsoleEmailTransport`:
**nenhum e-mail é enviado** e o console registra apenas o tipo e o e-mail
mascarado. Para envio real, configure `RESEND_API_KEY` e `EMAIL_FROM` no `.env`.
Em produção, a ausência da chave gera erro (exceto com `ALLOW_LOG_EMAILS`).

## TOTP — onde informar o código

- **Login**: após entrar com senha, um perfil com 2º fator ativo recebe
  `twoFactorRedirect`; o formulário mostra o campo de **6 dígitos do
  autenticador** e um link "Perdi o celular: usar código de recuperação".
  Implementado em `app/(auth)/login/LoginForm.tsx` + `TotpStep.tsx`.
- **Configuração do autenticador**: `app/(auth)/configurar-2fa/SetupForm.tsx`
  pede a senha, mostra a URI TOTP e valida o código de 6 dígitos. Após ativar,
  são exibidos os 10 códigos de recuperação **uma única vez**.
- **Ativação da conta**: `app/(auth)/ativar/AtivarForm.tsx` tem um campo de
  6 dígitos, mas é o **código de confirmação por e-mail**, não TOTP (8.4.3).

Após ativar seu `TEST_EMAIL`, faça login e você será redirecionado para
`/configurar-2fa` para cadastrar o autenticador.
