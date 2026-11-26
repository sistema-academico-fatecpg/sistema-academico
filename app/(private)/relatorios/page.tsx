export const instant = false;

import type { Metadata } from "next";
import { adminAccessReport } from "@/app/lib/audit/admin-access-report";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { PERMISSIONS } from "@/app/types/roles";
import { DataTable, PageHeader, Panel } from "@/components/ui";

export const metadata: Metadata = { title: "Relatório semestral de acessos" };

export default async function Page() {
  await requirePagePermission(PERMISSIONS.REPORTS_READ);
  const report = await adminAccessReport();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Relatório semestral"
        description="Acessos administrativos dos últimos 6 meses para revisão do Admin Master, com acompanhamento do Auditor (8.7.3 / ISO 27002 5.18)."
      />
      <Panel padding="p-5">
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
      </Panel>
      <DataTable
        columns={[
          { key: "userId", header: "Usuário", render: (row) => row.userId ?? "—" },
          { key: "role", header: "Perfil", render: (row) => row.role ?? "—" },
          { key: "events", header: "Eventos" },
          {
            key: "lastAccess",
            header: "Último acesso",
            render: (row) =>
              row.lastAccess ? new Date(row.lastAccess).toLocaleString("pt-BR") : "—",
          },
        ]}
        rows={report.byUser}
        rowKey={(row) => `${row.userId}:${row.role}`}
        emptyMessage="Nenhum acesso administrativo no período."
      />
    </section>
  );
}
