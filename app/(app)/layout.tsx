export const instant = false;

import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
          <Link className="font-semibold" href="/">
            Sistema Acadêmico
          </Link>
          <Link href="/usuarios">Usuários</Link>
          <Link href="/usuarios/novo">Novo usuário</Link>
          <Link className="ml-auto" href="/login">
            Entrar
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
