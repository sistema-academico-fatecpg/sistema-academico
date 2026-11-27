export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { auditReader } from "@/app/lib/audit/reader";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { requirePageUser } from "@/app/lib/auth/page-guard";
import { AlertFilterSchema, LogFilterSchema } from "@/app/types/log";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader } from "@/components";
import { AlertList } from "./AlertList";
import { LogFilters } from "./LogFilters";
import { LogTable } from "./LogTable";
import styles from "./styles.module.scss";

export const metadata: Metadata = { title: "Auditoria" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePageUser();
  // 10.4: somente Auditor; Suporte Técnico entra apenas por concessão (10.8).
  const isAuditor = actor.roles.includes("AUDITOR");
  if (!isAuditor && !actor.roles.includes("SUPORTE_TECNICO")) redirect("/dashboard");
  if (isAuditor && !actor.permissions.has(PERMISSIONS.AUDIT_LOGS_READ)) {
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
    <section className={styles.page}>
      <PageHeader
        title="Auditoria"
        description="Registros imutáveis e somente leitura. Consultas e exportações também são registradas."
      />
      <LogFilters raw={raw} />
      <LogTable items={logs.items} />
      <AlertList items={alerts.items} canAcknowledge={isAuditor} />
    </section>
  );
}
