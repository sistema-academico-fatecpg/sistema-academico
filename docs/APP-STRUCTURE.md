# Estrutura de rotas (`app/`)

## Front-end em `(web)`

Tudo que é interface mora em `app/(web)`. O grupo não aparece na URL, então
`/app/(web)/(private)/dashboard/page.tsx` continua acessível em `/dashboard`.
A back-end (`api/`, `lib/`, `repositories/`, `types/`) permanece na raiz de `app/`.

| Caminho                                              | URL                            | Layout                                       | Conteúdo                                            |
| ---------------------------------------------------- | ------------------------------ | -------------------------------------------- | --------------------------------------------------- |
| `app/layout.tsx`                                     | —                              | raiz: `<html>/<body>` e metadata             | base de tudo                                        |
| `app/(web)/layout.tsx`                               | —                              | importa `styles/globals.scss`                | baseline visual                                     |
| `app/(web)/page.tsx`                                 | `/`                            | raiz                                         | redireciona para `/dashboard` ou `/login`           |
| `app/(web)/login`                                    | `/login`                       | sem menu                                     | única página pública de entrada                     |
| `app/(web)/ativar`, `app/(web)/redefinir-senha`      | `/ativar`, `/redefinir-senha`  | cartão (`AuthCard`), sem menu                | mesma tela para definir a senha (`SetPasswordForm`) |
| `app/(web)/privacidade`                              | `/privacidade`                 | sem menu                                     | aviso de privacidade público (11.1.5)               |
| `app/(web)/(private)/layout.tsx`                     | —                              | **sidebar + header + guard de autenticação** | área logada                                         |
| `app/(web)/(private)/configurar-2fa`                 | `/configurar-2fa`              | `(private)`                                  | TOTP e códigos de recuperação                       |
| `app/(web)/(private)/dashboard`, `usuarios`, `notas` | `/dashboard`, `/usuarios`, ... | `(private)`                                  | todos os módulos internos                           |

`ativar` e `redefinir-senha` são públicos porque os links chegam por e-mail a
quem ainda não está autenticado. Não existe "esqueci minha senha": a troca é
presencial e a secretaria (Admin Secundário) solicita o envio do link em
`/usuarios`, pela ação **Redefinir senha** (`POST /api/users/[id]/request-password-reset`).

## Componentes compartilhados

As primitivas visuais ficam em `app/(web)/components/<CamelCase>/` e são
exportadas pelo barrel `@/components`: `Button`, `Icon`, `Field`, `Confirm`,
`DataTable`, `Panel`, `PageHeader`, `Badge`, `FormFeedback`, `AuthCard`, `Shell`,
`SetPasswordForm`, entre outras. Cada diretório tem seu `styles.module.scss`,
que usa `@use "@/web/styles/tokens" as *;`. Não há mais `components/ui/` nem
classes Tailwind.

Páginas grandes são divididas em componentes no próprio diretório da rota
(ex.: `aprovacoes/ApprovalCard.tsx`, `auditoria/LogTable.tsx`).
Ver `.github/README.md` para os checks de CI.
