import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/app/components/branding/Logo";
import { getAuthenticatedUser } from "@/app/lib/auth/session";

const navigation = [
  {
    href: "/dashboard",
    label: "Visão geral",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"],
  },
  { href: "/usuarios", label: "Usuários", roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO"] },
  { href: "/perfis", label: "Perfis e permissões", roles: ["ADMIN_MASTER"] },
  {
    href: "/cursos",
    label: "Cursos",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
  },
  {
    href: "/periodos",
    label: "Períodos",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
  },
  {
    href: "/disciplinas",
    label: "Disciplinas",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
  },
  {
    href: "/matriculas",
    label: "Matrículas",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO"],
  },
  {
    href: "/notas",
    label: "Notas",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO"],
  },
  { href: "/aprovacoes", label: "Aprovações", roles: ["ADMIN_MASTER", "AUDITOR"] },
  { href: "/auditoria", label: "Auditoria", roles: ["AUDITOR"] },
  { href: "/suporte", label: "Acesso de suporte", roles: ["AUDITOR", "SUPORTE_TECNICO"] },
  { href: "/incidentes", label: "Incidentes", roles: ["ADMIN_MASTER", "AUDITOR"] },
  { href: "/relatorios", label: "Relatório semestral", roles: ["ADMIN_MASTER", "AUDITOR"] },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  if (actor.mfaSetupRequired) redirect("/configurar-2fa");
  const links = navigation.filter((item) =>
    item.roles.some((role) => actor.roles.includes(role as (typeof actor.roles)[number])),
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen">
        <div className="flex h-20 items-center border-b border-slate-100 px-6">
          <Logo compact />
        </div>
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">
            Área institucional
          </p>
          <nav aria-label="Navegação principal" className="mt-4 grid gap-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-[#6b1720]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-6 border-t border-slate-100 px-6 py-5">
          <p className="truncate text-sm font-semibold">{actor.user.socialName || actor.name}</p>
          <p className="mt-1 text-xs text-slate-500">{actor.roles.join(" · ")}</p>
          <form action="/api/auth/logout" method="post" className="mt-4">
            <button className="text-sm font-medium text-[#6b1720]" type="submit">
              Encerrar sessão
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <span className="text-sm text-slate-500">Portal acadêmico</span>
          <span className="text-xs font-semibold tracking-wide text-slate-500">FATECPG</span>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-5 md:p-8">{children}</main>
        <footer className="border-t border-slate-200 px-8 py-5 text-center text-xs text-slate-400">
          Sistema Acadêmico · Ambiente institucional
        </footer>
      </div>
    </div>
  );
}
