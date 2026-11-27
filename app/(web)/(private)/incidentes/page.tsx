export const instant = false;

import type { Metadata } from "next";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { db } from "@/app/lib/db";
import { PERMISSIONS } from "@/app/types/roles";
import { DataTable, PageHeader } from "@/components";
import { IncidentPanel } from "./IncidentPanel";
import styles from "./styles.module.scss";

export const metadata: Metadata = { title: "Incidentes de segurança" };

export default async function Page() {
  await requirePagePermission(PERMISSIONS.BACKUPS_READ);
  const items = await db.incident.findMany({ orderBy: { reportedAt: "desc" } });

  return (
    <section className={styles.page}>
      <PageHeader
        title="Incidentes de segurança"
        description="Comunicação, contenção, análise, restauração autorizada e notificação (seção 13)."
      />
      <IncidentPanel />
      <DataTable
        columns={[
          { key: "title", header: "Título" },
          { key: "severity", header: "Severidade" },
          { key: "status", header: "Status" },
          {
            key: "reportedAt",
            header: "Registro",
            render: (incident) => incident.reportedAt.toLocaleString("pt-BR"),
          },
        ]}
        rows={items}
        rowKey={(incident) => incident.id}
        emptyMessage="Nenhum incidente registrado."
      />
    </section>
  );
}
