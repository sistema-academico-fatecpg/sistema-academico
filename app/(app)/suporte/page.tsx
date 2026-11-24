export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { SupportAccessGrantRepository } from "@/app/repositories/support-access-grant.repository";
import { SupportDecisionForm, SupportRequestForm } from "./SupportForms";

export const metadata: Metadata = { title: "Acesso de suporte" };

export default async function Page() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  if (!actor.roles.includes("AUDITOR") && !actor.roles.includes("SUPORTE_TECNICO")) {
    redirect("/dashboard");
  }

  const grants = await new SupportAccessGrantRepository().list();
  const pending = grants.filter((grant) => grant.status === "PENDING");

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Acesso excepcional de suporte
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Sem permissão permanente: somente leitura, no escopo aprovado, por no máximo 8 horas e com
          revogação automática (10.8).
        </p>
      </div>

      {actor.roles.includes("SUPORTE_TECNICO") ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Nova solicitação</h2>
          <div className="mt-4">
            <SupportRequestForm />
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="font-semibold text-slate-900">Solicitações pendentes</h2>
        {pending.map((grant) => (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            key={grant.id}
          >
            <p className="text-sm font-semibold">{grant.requester.name}</p>
            <p className="mt-1 text-sm text-slate-600">{grant.reason}</p>
            <p className="mt-2 text-xs text-slate-500">
              {grant.modules.map((item) => item.module).join(", ")} ·{" "}
              {grant.startsAt.toLocaleString("pt-BR")} até {grant.endsAt.toLocaleString("pt-BR")}
            </p>
            {grant.involvesAuditor ? (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                Envolve o Auditor: exige autorização da direção ({grant.authorizationDocument}).
              </p>
            ) : null}
            {actor.roles.includes("AUDITOR") ? (
              <SupportDecisionForm grantId={grant.id} involvesAuditor={grant.involvesAuditor} />
            ) : null}
          </article>
        ))}
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            Nenhuma solicitação pendente.
          </p>
        ) : null}
      </div>
    </section>
  );
}
