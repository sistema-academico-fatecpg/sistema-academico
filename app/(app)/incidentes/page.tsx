export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { PERMISSIONS } from "@/app/types/roles";
import { IncidentPanel } from "./IncidentPanel";

export const metadata: Metadata = { title: "Incidentes de segurança" };

export default async function Page() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  // 7.3: permissão efetiva do banco (Admin Master e Auditor têm BACKUPS_READ).
  if (!actor.permissions.has(PERMISSIONS.BACKUPS_READ)) redirect("/dashboard");
  const items = await db.incident.findMany({ orderBy: { reportedAt: "desc" } });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Incidentes de segurança
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Comunicação, contenção, análise, restauração autorizada e notificação (seção 13).
        </p>
      </div>
      <IncidentPanel />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Severidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Registro</th>
            </tr>
          </thead>
          <tbody>
            {items.map((incident) => (
              <tr className="border-t border-slate-100" key={incident.id}>
                <td className="px-4 py-3">{incident.title}</td>
                <td className="px-4 py-3">{incident.severity}</td>
                <td className="px-4 py-3">{incident.status}</td>
                <td className="px-4 py-3">{incident.reportedAt.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
