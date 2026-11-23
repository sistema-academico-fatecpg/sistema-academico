import Link from "next/link";
import { getAuthenticatedUser } from "@/app/lib/auth/session";

const cards = [
  { href: "/usuarios", title: "Usuários", description: "Contas, perfis e ciclo de vida.", roles: ["ADMIN_MASTER","ADMIN_SECUNDARIO"], icon: "01" },
  { href: "/cursos", title: "Cursos", description: "Estrutura e oferta acadêmica.", roles: ["ADMIN_MASTER","ADMIN_SECUNDARIO","ALUNO","PROFESSOR"], icon: "02" },
  { href: "/periodos", title: "Períodos", description: "Calendário e janelas acadêmicas.", roles: ["ADMIN_MASTER","ADMIN_SECUNDARIO","ALUNO","PROFESSOR"], icon: "03" },
  { href: "/disciplinas", title: "Disciplinas", description: "Componentes curriculares e turmas.", roles: ["ADMIN_MASTER","ADMIN_SECUNDARIO","ALUNO","PROFESSOR"], icon: "04" },
  { href: "/matriculas", title: "Matrículas", description: "Vínculos acadêmicos e dependências.", roles: ["ADMIN_MASTER","ADMIN_SECUNDARIO","PROFESSOR","ALUNO"], icon: "05" },
  { href: "/notas", title: "Notas", description: "Lançamento, consulta e histórico.", roles: ["ADMIN_MASTER","ADMIN_SECUNDARIO","PROFESSOR","ALUNO"], icon: "06" },
  { href: "/aprovacoes", title: "Operações críticas", description: "Solicitações e decisões com dupla aprovação.", roles: ["ADMIN_MASTER"], icon: "07" },
  { href: "/auditoria", title: "Auditoria", description: "Registros, alertas e rastreabilidade.", roles: ["AUDITOR"], icon: "08" },
  { href: "/suporte", title: "Acesso excepcional", description: "Concessões temporárias e escopo limitado.", roles: ["AUDITOR","SUPORTE_TECNICO"], icon: "09" },
];

export default async function DashboardPage() {
  const actor = await getAuthenticatedUser();
  const visible = cards.filter(card => card.roles.some(role => actor?.roles.includes(role as NonNullable<typeof actor>["roles"][number])));
  return <div className="space-y-8">
    <section className="overflow-hidden rounded-2xl bg-[#501018] px-7 py-8 text-white md:px-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e6c98d]">Painel institucional</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Olá, {actor?.user.socialName || actor?.name}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Acesse os módulos disponíveis conforme seus perfis e permissões institucionais.</p>
      </div>
      <div className="mt-7 flex flex-wrap gap-2">{actor?.roles.map(role => <span key={role} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">{role.replaceAll("_"," ")}</span>)}</div>
    </section>
    <section>
      <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">Acesso rápido</p><h2 className="mt-1 text-xl font-bold">Seus módulos</h2></div><span className="text-sm text-slate-500">{visible.length} disponíveis</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(card => <Link key={card.href} href={card.href} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c99a3b] hover:shadow-md">
          <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-widest text-[#b28a45]">{card.icon}</span><span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#6b1720]">↗</span></div>
          <h3 className="mt-5 font-semibold text-slate-900">{card.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
        </Link>)}
      </div>
    </section>
  </div>;
}
