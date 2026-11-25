export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminAccessReport } from "@/app/lib/audit/admin-access-report";
import { getAuthenticatedUser } from "@/app/lib/auth/session";

export const metadata: Metadata = { title: "Relatório semestral de acessos" };

export default async function Page() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
    redirect("/dashboard");
  }
  const report = await adminAccessReport();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Relatório semestral
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Acessos administrativos dos últimos 6 meses para revisão do Admin Master, com
          acompanhamento do Auditor (8.7.3 / ISO 27002 5.18).
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          {new Date(report.periodStart).toLocaleDateString("pt-BR")} a{" "}
          {new Date(report.periodEnd).toLocaleDateString("pt-BR")} · {report.totalEvents} eventos
        </p>
        <a
          className="mt-3 inline-block rounded-lg bg-[#6b1720] px-4 py-2 text-sm font-semibold text-white"
          href="/api/reports/admin-access?format=csv"
        >
          Baixar CSV (emissão registrada em log)
        </a>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Eventos</th>
              <th className="px-4 py-3">Último acesso</th>
            </tr>
          </thead>
          <tbody>
            {report.byUser.map((row) => (
              <tr className="border-t border-slate-100" key={`${row.userId}:${row.role}`}>
                <td className="px-4 py-3">{row.userId ?? "—"}</td>
                <td className="px-4 py-3">{row.role ?? "—"}</td>
                <td className="px-4 py-3">{row.events}</td>
                <td className="px-4 py-3">
                  {row.lastAccess ? new Date(row.lastAccess).toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
