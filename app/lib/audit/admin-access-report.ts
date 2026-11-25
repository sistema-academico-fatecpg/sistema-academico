import { db } from "@/app/lib/db";
import type { RoleName } from "@/app/types/common";

/** Perfis cujos acessos entram no relatório semestral (8.7.3 / ISO 27002 5.18). */
const ADMIN_ROLES: readonly RoleName[] = [
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "AUDITOR",
  "SUPORTE_TECNICO",
];

const SENSITIVE_ACTIONS: readonly string[] = [
  "PERMISSIONS_CHANGED",
  "ROLE_ASSIGNED",
  "ROLE_REMOVED",
  "ROLE_CREATED",
  "ACCOUNT_CREATED",
  "ACCOUNT_UPDATED",
  "ACCOUNT_BLOCKED",
  "ACCOUNT_DEACTIVATED",
  "CRITICAL_OPERATION_REQUESTED",
  "CRITICAL_OPERATION_APPROVED",
  "CRITICAL_OPERATION_REJECTED",
  "CRITICAL_OPERATION_EXECUTED",
  "SELF_APPROVAL_ATTEMPT",
  "AUDIT_LOG_VIEWED",
  "EXPORT",
  "MASS_EXPORT",
  "SUPPORT_ACCESS_APPROVED",
  "SUPPORT_ACCESS_CONSULTED",
  "EMERGENCY_MASTER_CREATED",
  "EMERGENCY_MASTER_REVIEWED",
  "SENSITIVE_DATA_REVEALED",
];

export type AdminAccessReport = {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  scope: string;
  totalEvents: number;
  byUser: Array<{
    userId: string | null;
    role: string | null;
    events: number;
    lastAccess: string | null;
  }>;
  byAction: Array<{ action: string; events: number }>;
  items: Array<{
    id: string;
    userId: string | null;
    role: string | null;
    action: string;
    module: string;
    result: string;
    createdAt: string;
  }>;
};

/**
 * 8.7.3: relatório semestral de acessos administrativos. A consulta pelo
 * Admin Master (com acompanhamento do Auditor) é registrada em log pela rota.
 */
export async function adminAccessReport(now = new Date()): Promise<AdminAccessReport> {
  const periodStart = new Date(now.getTime() - 182 * 24 * 60 * 60_000);
  const items = await db.log.findMany({
    where: {
      createdAt: { gte: periodStart, lte: now },
      OR: [{ role: { in: [...ADMIN_ROLES] } }, { action: { in: [...SENSITIVE_ACTIONS] } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      role: true,
      action: true,
      module: true,
      result: true,
      createdAt: true,
    },
    take: 5000,
  });

  const byUserMap = new Map<
    string,
    { userId: string | null; role: string | null; events: number; lastAccess: string | null }
  >();
  const byActionMap = new Map<string, number>();
  for (const item of items) {
    const key = `${item.userId ?? "anon"}:${item.role ?? "sem-perfil"}`;
    const entry = byUserMap.get(key) ?? {
      userId: item.userId,
      role: item.role,
      events: 0,
      lastAccess: null,
    };
    entry.events += 1;
    const iso = item.createdAt.toISOString();
    if (!entry.lastAccess || iso > entry.lastAccess) entry.lastAccess = iso;
    byUserMap.set(key, entry);
    byActionMap.set(item.action, (byActionMap.get(item.action) ?? 0) + 1);
  }

  return {
    generatedAt: now.toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    scope: "Acessos administrativos e ações sensíveis dos últimos 6 meses",
    totalEvents: items.length,
    byUser: [...byUserMap.values()].sort((a, b) => b.events - a.events),
    byAction: [...byActionMap.entries()]
      .map(([action, events]) => ({ action, events }))
      .sort((a, b) => b.events - a.events),
    items: items.map((item) => ({
      id: item.id,
      userId: item.userId,
      role: item.role,
      action: item.action,
      module: item.module,
      result: item.result,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
