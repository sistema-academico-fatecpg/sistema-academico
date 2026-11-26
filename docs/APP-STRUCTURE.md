# Estrutura de rotas (`app/`)

## Por que existem pastas com parênteses

No App Router, pastas `app/(nome)` são **route groups**: organizam arquivos e
compartilham `layout.tsx` **sem aparecer na URL**. `app/(private)/dashboard/page.tsx`
é acessível em `/dashboard`, não em `/private/dashboard`.

O projeto precisa de **três layouts diferentes**, e é exatamente para isso que os
grupos servem:

| Caminho                                                                            | URL                            | Layout                                       | Conteúdo                                  |
| ---------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------- | ----------------------------------------- |
| `app/layout.tsx`                                                                   | —                              | raiz: `<html>/<body>`, fontes, `globals.css` | base de tudo                              |
| `app/page.tsx`                                                                     | `/`                            | raiz                                         | redireciona para `/dashboard` ou `/login` |
| `app/privacidade/page.tsx`                                                         | `/privacidade`                 | raiz                                         | aviso de privacidade público (11.1.5)     |
| `app/(auth)/layout.tsx`                                                            | —                              | cartão centralizado, sem menu                | fluxos de autenticação                    |
| `app/(auth)/login`, `ativar`, `configurar-2fa`, `esqueci-senha`, `redefinir-senha` | `/login` etc.                  | `(auth)`                                     | login, ativação, MFA, recuperação         |
| `app/(private)/layout.tsx`                                                         | —                              | **sidebar + header + guard de autenticação** | área logada                               |
| `app/(private)/dashboard`, `usuarios`, `notas`, ...                                | `/dashboard`, `/usuarios`, ... | `(private)`                                  | todos os módulos internos                 |

Se tudo fosse colocado na raiz, o `app/layout.tsx` teria que decidir, página por
página, se mostra ou não a sidebar — inclusive em `/login` e `/privacidade`.
Isso exigiria condicionais por `pathname` no layout raiz (fragil, e mistura
servidor/cliente) ou repetir o guard em cada página. Os grupos resolvem isso de
forma declarativa.

## Por que `(private)` e não `(app)`

`(app)` era um nome tautológico e confuso (quase idêntico ao diretório `app/`).
Foi renomeado para **`(private)`**, que descreve a regra do grupo: só entra quem
está autenticado. O guard central está em `app/lib/auth/page-guard.ts`
(`requirePageUser` / `requirePagePermission`) e é usado pelo layout e por todas
as páginas com dados.

`(auth)` foi mantido: descreve com precisão o outro grupo (fluxos de
autenticação, que também precisam de um layout sem menu). A dupla
`(private)` / `(auth)` deixa a intenção explícita.

> Renomear um route group não muda nenhuma URL, portanto não quebra links,
> bookmarks nem redirecionamentos.

## Componentes compartilhados

As primitivas visuais ficam em `app/components/ui/` (`PageHeader`, `Panel`,
`DataTable`, `Badge`, `Button`, `Input`, `Label`, `AlertBanner`,
`ModulePlaceholder`). Páginas grandes foram divididas em componentes menores no
próprio diretório da rota (ex.: `aprovacoes/ApprovalCard.tsx`,
`auditoria/LogTable.tsx`, `perfis/RoleCard.tsx`). Ver `.github/README.md` para
os checks de CI que garantem que tudo continua compilando.
