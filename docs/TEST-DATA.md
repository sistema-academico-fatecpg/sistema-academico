# Massa de teste

## Como gerar

```bash
# 1) (opcional) defina TEST_EMAIL no .env: é o e-mail real do primeiro Admin Master
# 2) aplique migrações e o seed de papéis
pnpm db:deploy
pnpm db:seed

# 3) crie a massa de teste
pnpm db:seed:test
```

O script é **idempotente**: usa `registrationNumber` como chave natural e só
emite novos links para contas ainda `PENDING_ACTIVATION`. Contas já ativadas
preservam senha, sessão e chave TOTP.

**Nenhum e-mail é enviado.** O script é exclusivo de desenvolvimento/homologação
e recusa `APP_ENV=production` ou `NODE_ENV=production`.

## O que é criado

| Perfil             | Quantidade | Matrículas            | E-mail institucional (login) |
| ------------------ | ---------- | --------------------- | ---------------------------- |
| `ADMIN_MASTER`     | 3          | `MAST001`–`MAST003`   | `@coord.academico.com`       |
| `ADMIN_SECUNDARIO` | 1          | `SEC001`              | `@admin.academico.com`       |
| `PROFESSOR`        | 2          | `PROF001`–`PROF002`   | `@prof.academico.com`        |
| `ALUNO`            | 40         | `20260001`–`20260040` | `@aluno.academico.com`       |

O e-mail institucional é gerado **pelo banco** no INSERT de `user_roles`
(`nome<matrícula>@<domínio do cargo>`), devolvido ao back via `RETURNING` e
copiado para `users.email`. O login sempre usa esse endereço institucional.

Além dos usuários: 1 curso (`CC`), 1 período vigente (2026/2), 6 disciplinas e
6 turmas (3 por professor), matrículas de cada aluno em duas turmas, notas
parciais com histórico, dependências (DP) e perfis de estudante (alguns menores
com consentimento). Não são criados usuários de Auditor/Suporte nesta massa.

## Ativação (sem envio de e-mail)

**Nenhuma senha é criada pelo seed** (seção 8.2). Para cada conta pendente o
script emite um token de uso único (24 h) e um código de 6 dígitos (10 min) e
grava em:

```
${TEST_DATA_OUTPUT_DIR:-/tmp/opencode}/test-data-activation.json
```

Arquivo criado com permissão `0600`. Cada entrada contém:

- `destinatario`: e-mail fictício (`@ficticio.local`) marcado como `[MOCK]`,
  **nunca enviado**;
- `destinatarioReal`: `true` apenas para o primeiro Admin Master quando
  `TEST_EMAIL` está definido (verificação pessoal). Esse é o **único** e-mail
  enviado pelo seed, sem variável de opt-in;
- `emailInstitucional`: conta de login, gerada pelo banco;
- `matricula`, `perfil`, `codigo` e `url` (já com `token` e `code`).

Os mesmos dados são impressos no console no formato:

```
[MOCK] aluno001@ficticio.local | institucional: aluno.00120260001@aluno.academico.com | http://localhost:3000/ativar?token=...&code=123456 | MOCK — nunca enviado
```

O primeiro Master aparece como `[REAL]` e recebe o link no `TEST_EMAIL` (desde
que `RESEND_API_KEY` esteja configurada; sem ela, o transporte de desenvolvimento
apenas registra o envio como não realizado). Os `[MOCK]` passam pelo mesmo
`MessagingService`, mas com um transporte de console injetado apenas naquela
operação — nada sai do processo. Copie a URL no navegador: o código já vem
preenchido e é validado no servidor.
Crie uma senha com no mínimo 12 caracteres (maiúscula, minúscula, número e
especial). No Docker, o arquivo fica montado em `./tmp/test-data` e o serviço
`seed-test-data` roda uma vez na subida (`docker compose logs -f seed-test-data`).

> A política 10.5 proíbe tokens em logs de produção. A impressão no console
> acontece apenas neste script de desenvolvimento, por solicitação explícita.

## Fluxo de cadastro (quem pode criar quem)

| Perfil logado      | Pode cadastrar                                  | Como                                                                                 |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ADMIN_MASTER`     | qualquer perfil, inclusive outro `ADMIN_MASTER` | perfis administrativos geram **solicitação pendente**; os demais são criados na hora |
| `ADMIN_SECUNDARIO` | somente `PROFESSOR` e `ALUNO`                   | criação direta, sem aprovação                                                        |
| demais perfis      | nada (sem `USERS_CREATE`)                       | —                                                                                    |

Cadastro de perfil administrativo exige justificativa (mín. 10 caracteres) e
dupla aprovação: **outro** Admin Master decide; em modo de conta única ou
contingência, a aprovação é do Auditor. Nenhuma senha é definida por quem
cadastra — o titular ativa pelo link.

Para testar: entre com o e-mail institucional do primeiro Master (veja o
arquivo/console de ativação; o link foi para o seu `TEST_EMAIL`), ative um
segundo Master com outro link do arquivo e só então teste aprovações em
`/aprovacoes`. Enquanto houver um único Master ativo, o sistema fica em modo de
conta única e as operações críticas ficam suspensas.

## TOTP — onde informar o código

- **Login**: após entrar com senha, um perfil com 2º fator ativo recebe
  `twoFactorRedirect`; o formulário mostra o campo de **6 dígitos do
  autenticador** e um link "Perdi o celular: usar código de recuperação".
- **Configuração do autenticador**: `app/(web)/(mfa)/configurar-2fa/SetupForm.tsx`
  pede a senha quando a configuração é iniciada pelo login, mostra a URI TOTP e
  valida o código de 6 dígitos. Após ativar, exibe os 10 códigos de recuperação
  **uma única vez**.
- **Ativação da conta**: `app/(web)/ativar/page.tsx` usa o `SetPasswordForm`
  compartilhado, com campo de 6 dígitos para o **código de confirmação por
  e-mail**, não TOTP (8.4.3). O código vem preenchido pela URL e é validado no
  servidor.

Após definir a senha, o titular é levado ao **login**. Ao entrar, perfis com MFA
obrigatório (Admin Master/Secundário e Professor) são direcionados para
`/configurar-2fa`; a chave é gerada com a sessão já autenticada, **sem pedir a
senha novamente** nem consultar `/api/auth/me` sem login: a chave é gerada por
`POST /api/auth/mfa/setup` com a sessão válida e confirmada com `verifyTotp`.
Não existe link "Configurar 2FA" na tela de login — deslogado, o usuário apenas
entra. Alunos entram diretamente no painel e podem configurar o autenticador
depois, se quiserem.

> **Atenção:** a chave TOTP muda se você recriar o volume do Postgres
> (`docker compose down -v`) ou usar "Gerar nova chave" na tela. Reexecutar o
> seed com a conta já `ACTIVE` não muda a chave. Use `docker compose down`
> (sem `-v`) para reiniciar sem apagar o banco.
