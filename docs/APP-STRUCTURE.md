# Estrutura de rotas (`app/`)

## Front-end em `(web)`

Tudo que é interface mora em `app/(web)`. O grupo não aparece na URL, então
`/app/(web)/(private)/dashboard/page.tsx` continua acessível em `/dashboard`.
A back-end (`api/`, `lib/`, `repositories/`, `types/`) permanece na raiz de `app/`.

| Caminho                                              | URL                            | Layout                                       | Conteúdo                                           |
| ---------------------------------------------------- | ------------------------------ | -------------------------------------------- | -------------------------------------------------- |
| `app/layout.tsx`                                     | —                              | raiz: `<html>/<body>` e metadata             | base de tudo                                       |
| `app/(web)/layout.tsx`                               | —                              | importa `styles/globals.scss`                | baseline visual                                    |
| `app/(web)/page.tsx`                                 | `/`                            | raiz                                         | redireciona para `/dashboard` ou `/login`          |
| `app/(web)/login`                                    | `/login`                       | sem menu                                     | única página pública de entrada                    |
| `app/(web)/ativar`                                   | `/ativar`                      | cartão (`AuthCard`), sem menu                | define a senha com token + código de e-mail        |
| `app/(web)/redefinir-senha`                          | `/redefinir-senha`             | cartão (`AuthCard`), sem menu                | redefine a senha com o token do link da secretaria |
| `app/(web)/privacidade`                              | `/privacidade`                 | sem menu                                     | aviso de privacidade público (11.1.5)              |
| `app/(web)/(private)/layout.tsx`                     | —                              | **sidebar + header + guard de autenticação** | área logada                                        |
| `app/(web)/(private)/configurar-2fa`                 | `/configurar-2fa`              | `(private)`                                  | TOTP e códigos de recuperação                      |
| `app/(web)/(private)/meus-dados`                     | `/meus-dados`                  | `(private)`                                  | cópia dos próprios dados em CSV (11.1.4)           |
| `app/(web)/(private)/dashboard`, `usuarios`, `notas` | `/dashboard`, `/usuarios`, ... | `(private)`                                  | demais módulos internos                            |

`ativar` e `redefinir-senha` são públicos porque os links chegam por e-mail a
quem ainda não está autenticado. Não existe "esqueci minha senha": a troca é
presencial e a secretaria (Admin Secundário com `USERS_UPDATE`) solicita o
envio do link em `/usuarios`, pela ação **Redefinir senha**
(`POST /api/users/[id]/request-password-reset`). Esse link de uso único, válido
por 30 minutos, é enviado ao **e-mail institucional** da conta e leva a
`/redefinir-senha?token=...`, onde o titular cria a senha
(`POST /api/auth/password-reset/confirm`).

Já o link de **ativação** é enviado ao **e-mail pessoal** cadastrado
(`personalEmail`; na massa de teste, `TEST_EMAIL`) e informa o e-mail
institucional usado no login. A URL contém o **código de confirmação de 6
dígitos por e-mail**, preenchido automaticamente em `/ativar`; o código expira
em 10 minutos e o link é de uso único (24 horas). Os 10 códigos de
recuperação do autenticador são exibidos uma única vez em `/configurar-2fa` e
são usados no login pelo link "Perdi o celular" — são códigos locais do 2FA,
distintos do código enviado por e-mail.

## Componentes compartilhados

As primitivas visuais ficam em `app/(web)/components/<CamelCase>/` e são
exportadas pelo barrel `@/components`: `Button`, `Icon`, `Field`, `Confirm`,
`DataTable`, `DownloadDataButton`, `Panel`, `PageHeader`, `Badge`,
`FormFeedback`, `AuthCard`, `Shell`, `SetPasswordForm`, entre outras. Cada
diretório tem seu `styles.module.scss`, que usa `@use "@/web/styles/tokens" as *;`.
Não há mais `components/ui/` nem classes Tailwind.

Páginas grandes são divididas em componentes no próprio diretório da rota
(ex.: `aprovacoes/ApprovalCard.tsx`, `auditoria/LogTable.tsx`). Ver
`.github/README.md` para os checks de CI.
