export const instant = false;

import type { Metadata } from "next";
import { adminAccessReport } from "@/app/lib/audit/admin-access-report";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { PERMISSIONS } from "@/app/types/roles";
import { DataTable, Icon, PageHeader, Panel } from "@/components";
import styles from "./styles.module.scss";

export const metadata: Metadata = { title: "Relatório semestral de acessos" };

export default async function Page() {
  await requirePagePermission(PERMISSIONS.REPORTS_READ);
  const report = await adminAccessReport();

  return (
    <section className={styles.page}>
      <PageHeader
        title="Relatório semestral"
        description="Acessos administrativos dos últimos 6 meses para revisão do Admin Master, com acompanhamento do Auditor (8.7.3 / ISO 27002 5.18)."
      />
      <Panel padding="p-5">
        <p className={styles.summary}>
          {new Date(report.periodStart).toLocaleDateString("pt-BR")} a{" "}
          {new Date(report.periodEnd).toLocaleDateString("pt-BR")} · {report.totalEvents} eventos
        </p>
        <a className={styles.downloadLink} href="/api/reports/admin-access?format=csv">
          <Icon name="download" size="sm" /> Baixar CSV (emissão registrada em log)
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
