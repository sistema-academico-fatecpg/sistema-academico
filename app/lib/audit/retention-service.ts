import { db } from "@/app/lib/db";

/** Prazos de guarda (10.7). */
export const AUDIT_RETENTION = {
  accessLogDays: 365,
  academicLog: "Mesmo prazo do registro acadêmico (Decreto 9.235/2017)",
  incidentYears: 5,
} as const;

const ACCESS_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_BLOCKED",
  "LOGOUT",
  "SESSION_EXPIRED",
];
const ACADEMIC_ACTIONS = [
  "ACADEMIC_RECORD_CREATED",
  "ACADEMIC_RECORD_UPDATED",
  "ACADEMIC_PERIOD_CREATED",
  "GRADES_PERIOD_UPDATED",
  "GRADES_PERIOD_CLOSED",
  "GRADE_CHANGED",
  "GRADE_CHANGE_OUTSIDE_PERIOD",
  "GRADE_CORRECTION_REQUESTED",
  "ENROLLMENT_CREATED",
  "ENROLLMENT_EXCEPTION_REQUESTED",
];
const INCIDENT_ACTIONS = ["INCIDENT_REPORTED", "INCIDENT_CONTAINED", "INCIDENT_CLOSED"];

/**
 * 10.9: manutenção da base de logs feita pela Infraestrutura sem leitura nem
 * alteração do conteúdo. Esta rotina apenas conta registros por classe de
 * retenção; o arquivamento é operação de banco, fora da aplicação.
 */
export async function auditRetentionReport(now = new Date()) {
  const accessCutoff = new Date(now.getTime() - AUDIT_RETENTION.accessLogDays * 86_400_000);
  const incidentCutoff = new Date(now.getTime() - AUDIT_RETENTION.incidentYears * 365 * 86_400_000);
  const [accessExpired, accessTotal, academicTotal, incidentTotal, incidentsPastRetention] =
    await Promise.all([
      db.log.count({
        where: { action: { in: ACCESS_ACTIONS }, createdAt: { lt: accessCutoff } },
      }),
      db.log.count({ where: { action: { in: ACCESS_ACTIONS } } }),
      db.log.count({ where: { action: { in: ACADEMIC_ACTIONS } } }),
      db.log.count({ where: { action: { in: INCIDENT_ACTIONS } } }),
      db.incident.count({ where: { closedAt: { lt: incidentCutoff } } }),
    ]);

  return {
    generatedAt: now.toISOString(),
    accessLogDays: AUDIT_RETENTION.accessLogDays,
    accessExpired,
    accessTotal,
    academicLog: AUDIT_RETENTION.academicLog,
    academicTotal,
    incidentYears: AUDIT_RETENTION.incidentYears,
    incidentTotal,
    incidentsPastRetention,
  };
}
