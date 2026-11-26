export const instant = false;

import { requirePageUser } from "@/app/lib/auth/page-guard";
import { DASHBOARD_CARDS } from "./cards";
import { DashboardCard } from "./DashboardCard";

export default async function DashboardPage() {
  const actor = await requirePageUser();
  const visible = DASHBOARD_CARDS.filter((card) =>
    card.roles.some((role) => actor.roles.includes(role)),
  );

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-[#501018] px-7 py-8 text-white md:px-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e6c98d]">
            Painel institucional
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Olá, {actor.user.socialName || actor.name}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Acesse os módulos disponíveis conforme seus perfis e permissões institucionais.
          </p>
        </div>
        <div className="mt-7 flex flex-wrap gap-2">
          {actor.roles.map((role) => (
            <span
              key={role}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium"
            >
              {role.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
              Acesso rápido
            </p>
            <h2 className="mt-1 text-xl font-bold">Seus módulos</h2>
          </div>
          <span className="text-sm text-slate-500">{visible.length} disponíveis</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((card) => (
            <DashboardCard card={card} key={card.href} />
          ))}
        </div>
      </section>
    </div>
  );
}
