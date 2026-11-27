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

O **e-mail institucional é gerado** no padrão `nomecodigo@academico.com` (nome
normalizado seguido de 6 caracteres únicos, sem `+`) e é com ele que você entra.
O `TEST_EMAIL` do `.env` é o seu **e-mail pessoal**, que recebe o link de
ativação — são dados distintos.

| Perfil             | E-mail institucional (login)   | Observação                                   |
| ------------------ | ------------------------------ | -------------------------------------------- |
| `ADMIN_MASTER`     | `coorda1b2c3@academico.com`    | seu usuário; pessoal = `TEST_EMAIL`          |
| `ADMIN_MASTER`     | `coord2b2c3d4@academico.com`   | vice-coordenação                             |
| `ADMIN_MASTER`     | `coord3c3d4e5@academico.com`   | terceiro Master (8.1.2)                      |
| `ADMIN_MASTER`     | `coord4d4e5f6@academico.com`   | quarto Master, apenas para teste local       |
| `ADMIN_SECUNDARIO` | `sec1e5f6a1@academico.com`     | secretaria                                   |
| `PROFESSOR`        | `prof1f6a1b2@academico.com`    | vinculado às 3 turmas                        |
| `ALUNO`            | `aluno1a2b3c4@academico.com`   | matrículas + nota                            |
| `ALUNO`            | `aluno2b3c4d5@academico.com`   | menor, com DP e consentimento do responsável |
| `AUDITOR`          | `auditor1c4d5e6@academico.com` | revisa logs e incidentes                     |
| `SUPORTE_TECNICO`  | `infra1d5e6f7@academico.com`   | concessão pendente e expirada                |

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

Arquivo criado com permissão `0600`. Nele, `institutionalEmail` é a conta de
login e `personalEmail` é apenas o destinatário do link. Copie a URL de
ativação, abra no navegador (o código de 6 dígitos já vem preenchido) e crie sua
senha (mínimo 12 caracteres com maiúscula, minúscula, número e especial). Cada
link é de uso único e expira em 24 h; o código expira em 10 minutos.

O e-mail pessoal **não** é usado como identificador de conta, não aparece em
logs nem no corpo das mensagens — apenas como destinatário e no campo
protegido `personalEmail` desse arquivo local.

> Os links **não** aparecem no console nem em logs: a política 10.5 proíbe
> gravar tokens/códigos em log. O arquivo local é a única cópia em dev.

## E-mails

O seed **não envia e-mail por padrão**. Para enviar os links de ativação para
cada usuário criado (inclusive seu `TEST_EMAIL`):

```bash
# .env
RESEND_API_KEY=...
EMAIL_FROM="Sistema Acadêmico <nao-responda@seu-dominio>"
TEST_DATA_SEND_EMAIL=1
TEST_EMAIL=seu@email.com

pnpm db:seed:test
```

Com `TEST_DATA_SEND_EMAIL=1`, o seed usa o mesmo transporte da aplicação. Sem
`RESEND_API_KEY`, o transporte é `ConsoleEmailTransport`: **nenhum e-mail é
enviado**, o console registra só o tipo e o e-mail mascarado, e o seed avisa
quantos deixaram de ser enviados. Em produção, a ausência da chave gera erro
(excepto com `ALLOW_LOG_EMAILS`).

Mesmo com envio habilitado, os links/códigos continuam sendo gravados no
arquivo local protegido — útil se o provedor falhar. Nenhum segredo é impresso
no console (10.5). Os fluxos normais da aplicação (redefinição solicitada pela
secretaria e alertas de segurança) também usam o mesmo transporte.

### Envio automático no `docker compose up`

O serviço `activation-mailer` do `docker-compose.yml` roda uma vez, depois que
o Postgres fica saudável: aplica as migrações, executa o seed de teste e envia
**apenas um** e-mail de ativação para `TEST_EMAIL` pela Resend. Contas ainda
pendentes têm o link/código atualizado no arquivo protegido montado em
`./tmp/test-data` (equivalente a `/tmp/opencode` dentro do container); contas já
`ACTIVE` são preservadas, com senha, sessão e chave TOTP intactas. Assim, cada
subida dos containers deixa o fluxo pronto para teste sem invalidar o
autenticador de quem já ativou:

```bash
docker compose up -d --build
# acompanhe: docker compose logs -f activation-mailer
```

O e-mail de ativação informa explicitamente o **e-mail institucional da conta**
(usado no login) e traz o código de 6 dígitos **dentro da URL**: ao abrir o
link, a página de ativação já preenche o campo. Um segundo e-mail traz a lista
de e-mails institucionais criados, sem tokens/códigos.

O aplicativo não depende do sucesso do envio para iniciar. Para reenviar sem
recriar os containers: `docker compose run --rm activation-mailer`.

## Fluxo de cadastro (quem pode criar quem)

| Perfil logado      | Pode cadastrar                                  | Como                                                                                 |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ADMIN_MASTER`     | qualquer perfil, inclusive outro `ADMIN_MASTER` | perfis administrativos geram **solicitação pendente**; os demais são criados na hora |
| `ADMIN_SECUNDARIO` | somente `PROFESSOR` e `ALUNO`                   | criação direta, sem aprovação                                                        |
| demais perfis      | nada (sem `USERS_CREATE`)                       | —                                                                                    |

Cadastro de perfil administrativo exige justificativa (mín. 10 caracteres) e
dupla aprovação: **outro** Admin Master decide; em modo de conta única ou
contingência, a aprovação é do Auditor. O documento de autorização da direção
(8.8.4) pode ser informado no formulário. Nenhuma senha é definida por quem
cadastra — o titular ativa pelo link.

Para testar: entre com seu e-mail institucional `coorda1b2c3@academico.com`
(Master; o link chegou no seu `TEST_EMAIL`), cadastre um `ADMIN_SECUNDARIO`
informando o e-mail pessoal dele e, em outra sessão, entre com
`coord2b2c3d4@academico.com` (outro Master — use o arquivo de ativação) e
aprove em `/aprovacoes`. Depois, com o secundário ativo, cadastre professor e
aluno.

**Importante:** apenas contas `ACTIVE` contam como Master (8.8). O seed cria os
quatro Masters como `PENDING_ACTIVATION`; enquanto só um estiver ativo, o sistema
fica em **modo de conta única** e as operações críticas ficam suspensas. Ative
um segundo Master (por exemplo, `coord2b2c3d4@academico.com`) com o link do arquivo
de ativação **antes** de testar aprovações. Até lá, a tela mostra o aviso de
conta única e a API recusa cadastros de perfil administrativo.

## TOTP — onde informar o código

- **Login**: após entrar com senha, um perfil com 2º fator ativo recebe
  `twoFactorRedirect`; o formulário mostra o campo de **6 dígitos do
  autenticador** e um link "Perdi o celular: usar código de recuperação".
  Implementado em `app/(web)/login/LoginForm.tsx` + `TotpStep.tsx`.
- **Configuração do autenticador**: `app/(web)/(private)/configurar-2fa/SetupForm.tsx`
  pede a senha quando a configuração é iniciada pelo login, mostra a URI TOTP e
  valida o código de 6 dígitos. Após ativar, exibe os 10 códigos de recuperação
  **uma única vez**.
- **Ativação da conta**: `app/(web)/ativar/page.tsx` usa o
  `SetPasswordForm` compartilhado (`app/(web)/components/SetPasswordForm`), que
  tem um campo de 6 dígitos para o **código de confirmação por e-mail**, não
  TOTP (8.4.3). O código vem preenchido pela URL e continua sendo validado no
  servidor. Não existe mais `AtivarForm.tsx`.

Após definir a senha, a ativação abre sessão automaticamente. Perfis com MFA
obrigatório (Admin Master/Secundário, Professor, Auditor e Suporte) vão direto
para `/configurar-2fa` usando a senha recém-criada — sem digitá-la de novo.
Alunos veem a opção de entrar diretamente no painel ou configurar o
autenticador voluntariamente.

> **Atenção:** a chave TOTP muda quando você ativa a conta novamente, recria o
> volume do Postgres (`docker compose down -v`) ou usa “Gerar nova chave” na
> tela de configuração. Reexecutar o seed com a conta já `ACTIVE` **não** muda a
> chave. Se o banco foi recriado, apague a entrada antiga do autenticador e
> adicione a chave atual da tela; códigos da chave antiga sempre retornarão
> `Código inválido`, mesmo com relógios corretos. Use `docker compose down`
> (sem `-v`) para reiniciar os containers sem apagar o banco.
>
> O servidor aceita desvios de até 120 s e também códigos gerados com
> SHA-256/512 ou janela de 60 s, mas o código deve ser digitado logo após
> aparecer no aplicativo.
