export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { auditReader } from "@/app/lib/audit/reader";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { AlertFilterSchema, LogFilterSchema } from "@/app/types/log";
import { AcknowledgeButton } from "./AcknowledgeButton";

export const metadata: Metadata = { title: "Auditoria" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  if (!actor.roles.includes("AUDITOR") && !actor.roles.includes("SUPORTE_TECNICO")) {
    redirect("/dashboard");
  }

  const raw = Object.fromEntries(
    Object.entries(await searchParams)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value] as const)
      .filter(([, value]) => typeof value === "string" && value.trim() !== ""),
  ) as Record<string, string>;
  const filter = LogFilterSchema.parse(raw);
  const alertFilter = AlertFilterSchema.parse({ acknowledged: "false", pageSize: "10", ...raw });

  await new SupportAccessService().assertCanRead(
    { id: actor.id, roles: actor.roles, ipAddress: "server" },
    "AUDIT_LOGS",
  );
  await createAuditService().record({
    userId: actor.id as never,
    role: actor.roles[0] ?? null,
    ipAddress: "server",
    action: AUDIT_ACTIONS.AUDIT_LOG_VIEWED,
    module: "AUDIT_LOGS",
    recordType: "Log",
    result: "SUCCESS",
    newValue: { filter },
  });

  const reader = auditReader();
  const [logs, alerts] = await Promise.all([
    reader.findMany(filter),
    reader.listAlerts(alertFilter),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Auditoria</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Registros imutáveis e somente leitura. Consultas e exportações também são registradas.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-6"
        method="get"
      >
        <label className="text-xs font-semibold text-slate-500">
          De
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
            name="from"
            type="date"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Até
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
            name="to"
            type="date"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Usuário (id)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
            name="userId"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Módulo
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
            name="module"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Ação
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
            name="action"
          />
        </label>
        <button
          className="mt-5 rounded-lg bg-[#6b1720] px-3 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Filtrar
        </button>
      </form>

      <div className="flex justify-end">
        <a
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          href={`/api/audit/export?${new URLSearchParams(raw as Record<string, string>).toString()}&format=csv`}
        >
          Exportar CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Módulo</th>
              <th className="px-3 py-2">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {logs.items.map((log) => {
              const item = log as Record<string, unknown>;
              return (
                <tr className="border-t border-slate-100" key={String(item.id)}>
                  <td className="px-3 py-2">{String(item.createdAt ?? "")}</td>
                  <td className="px-3 py-2">{String(item.userId ?? "—")}</td>
                  <td className="px-3 py-2">{String(item.action ?? "")}</td>
                  <td className="px-3 py-2">{String(item.module ?? "")}</td>
                  <td className="px-3 py-2">{String(item.result ?? "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Alertas pendentes</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {alerts.items.map((alert) => {
            const item = alert as Record<string, unknown>;
            return (
              <li
                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"
                key={String(item.id)}
              >
                <span>
                  <span className="font-semibold">{String(item.type)}</span> —{" "}
                  {String(item.message)}
                </span>
                {actor.roles.includes("AUDITOR") ? (
                  <AcknowledgeButton id={String(item.id)} />
                ) : null}
              </li>
            );
          })}
          {alerts.items.length === 0 ? (
            <li className="text-slate-500">Nenhum alerta pendente.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
