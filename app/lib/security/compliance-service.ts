import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { conflict, validationError } from "@/app/lib/auth/errors";
import { db } from "@/app/lib/db";
import { lastRestoreMeasurement } from "@/app/lib/security/backup-service";
import {
  BACKUP_MEDIA_MAX_YEARS,
  backupCloudStatus,
  KEY_ROTATION_DAYS,
  keyRotationStatus,
  RESTORE_TEST_DAYS,
  RPO_TARGET_HOURS,
  RTO_TARGET_HOURS,
} from "@/app/lib/security/env";

type Actor = { id: string; roles: readonly string[]; ipAddress: string };

/** 16: alteração legal registrada na trilha de auditoria dispara nova revisão. */
export const LEGAL_CHANGE_ACTION = "LEGAL_CHANGE_RECORDED";

export type PolicyReviewType = "ANNUAL" | "LEGAL_CHANGE" | "INCIDENT" | "OTHER";

function alert(type: string, message: string, ipAddress: string, details: Record<string, unknown>) {
  return createAuditService()
    .raiseAlert(
      type as never,
      {
        userId: null,
        role: null,
        ipAddress,
        action: `ALERT_${type}`,
        module: "BACKUPS",
        recordType: "Maintenance",
        result: "FAILURE",
        newValue: { ...details, message },
      },
      undefined,
    )
    .then(() => undefined)
    .catch(() => undefined);
}

/** 10.1: compara relógio da aplicação com o do banco (NTP). */
export async function clockDriftReport(now = new Date()) {
  const rows = (await db.$queryRawUnsafe("SELECT now() AS now")) as Array<{ now: Date }>;
  const dbNow = rows[0]?.now ? new Date(rows[0].now) : null;
  const driftSeconds = dbNow ? Math.abs(now.getTime() - dbNow.getTime()) / 1000 : null;
  const compliant = driftSeconds !== null && driftSeconds <= 5;
  return {
    checkedAt: now.toISOString(),
    databaseTime: dbNow?.toISOString() ?? null,
    applicationTime: now.toISOString(),
    driftSeconds,
    maxDriftSeconds: 5,
    compliant,
  };
}

/** 11.2.4: rotação anual e dois custodiantes. */
export async function keyRotationReport(now = new Date(), ipAddress = "maintenance") {
  const rotation = keyRotationStatus(now);
  const cloud = backupCloudStatus();
  const report = {
    ...rotation,
    rotationDays: KEY_ROTATION_DAYS,
    cloud: {
      mfa: cloud.mfa,
      immutable: cloud.immutable,
      region: cloud.region,
      international: cloud.international,
      transferAuthorized: Boolean(cloud.transferAuthorization) || !cloud.international,
    },
    compliant: !rotation.overdue && rotation.custodiansValid,
  };
  if (rotation.overdue || !rotation.custodiansValid) {
    await alert(
      "KEY_ROTATION_OVERDUE",
      "Rotação de chave vencida ou custodiantes inválidos.",
      ipAddress,
      report as never,
    );
  }
  await createAuditService().record({
    userId: null,
    role: null,
    ipAddress,
    action: AUDIT_ACTIONS.KEY_ROTATION_CHECKED,
    module: "BACKUPS",
    recordType: "Maintenance",
    result: report.compliant ? "SUCCESS" : "FAILURE",
    newValue: report as never,
  });
  return report;
}

/** 11.3.2: HD trancado, desconectado e substituído a cada 3 anos. */
export async function backupMediaReport(now = new Date(), ipAddress = "maintenance") {
  const media = await db.backupMedia.findMany({ orderBy: { installedAt: "asc" } });
  const items = media.map((item) => {
    const ageYears = (now.getTime() - item.installedAt.getTime()) / (365.25 * 86_400_000);
    return {
      id: item.id,
      label: item.label,
      lockerLocation: item.lockerLocation,
      installedAt: item.installedAt.toISOString(),
      ageYears: Number(ageYears.toFixed(2)),
      disconnected: Boolean(item.disconnectedAt),
      lastInspectionAt: item.lastInspectionAt?.toISOString() ?? null,
      status: item.status,
      overdue:
        item.status === "ACTIVE" && (ageYears > BACKUP_MEDIA_MAX_YEARS || !item.disconnectedAt),
    };
  });
  const overdue = items.filter((item) => item.overdue);
  if (overdue.length > 0) {
    await alert(
      "BACKUP_MEDIA_OVERDUE",
      "Mídia de backup vencida ou sem desconexão registrada.",
      ipAddress,
      { count: overdue.length },
    );
  }
  await createAuditService().record({
    userId: null,
    role: null,
    ipAddress,
    action: AUDIT_ACTIONS.BACKUP_MEDIA_CHECKED,
    module: "BACKUPS",
    recordType: "BackupMedia",
    result: overdue.length === 0 ? "SUCCESS" : "FAILURE",
    newValue: { total: items.length, overdue: overdue.length },
  });
  return { maxYears: BACKUP_MEDIA_MAX_YEARS, items, overdueCount: overdue.length };
}

/** 11.3.4/11.3.5: teste mensal de restauração e RPO/RTO medidos. */
export async function restoreTestReport(now = new Date()) {
  const [latest, measurement] = await Promise.all([
    db.backupRecord.findFirst({
      where: { restoreTestAt: { not: null } },
      orderBy: { restoreTestAt: "desc" },
      select: { id: true, restoreTestAt: true },
    }),
    lastRestoreMeasurement(),
  ]);
  const daysSince = latest?.restoreTestAt
    ? (now.getTime() - latest.restoreTestAt.getTime()) / 86_400_000
    : null;
  return {
    lastRestoreTestAt: latest?.restoreTestAt?.toISOString() ?? null,
    daysSinceLastTest: daysSame(daysSince),
    intervalDays: RESTORE_TEST_DAYS,
    overdue: daysSince === null || daysSince > RESTORE_TEST_DAYS,
    rpoHours: RPO_TARGET_HOURS,
    /** Meta contratual: 8h; valor medido em `rtoHours`. */
    rtoTargetHours: RTO_TARGET_HOURS,
    rtoHours: measurement.durationHours,
    restoreDurationMs: measurement.durationMs,
    restoreMeasuredAt: measurement.measuredAt,
    restoreMode: measurement.mode,
    rtoWithinTarget:
      measurement.durationHours === null ? null : measurement.durationHours <= RTO_TARGET_HOURS,
  };
}

function daysSame(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(2));
}

/** 16: revisão anual (ou após incidente relevante ou mudança legal). */
export async function policyReviewReport(now = new Date(), ipAddress = "maintenance") {
  const last = await db.policyReview.findFirst({ orderBy: { reviewedAt: "desc" } });
  const [relevantIncident, legalChange] = await Promise.all([
    db.incident.findFirst({
      where: {
        severity: { in: ["HIGH", "CRITICAL"] },
        reportedAt: { gt: last?.reviewedAt ?? new Date(0) },
      },
      orderBy: { reportedAt: "desc" },
      select: { id: true, reportedAt: true },
    }),
    db.log.findFirst({
      where: {
        action: LEGAL_CHANGE_ACTION,
        createdAt: { gt: last?.reviewedAt ?? new Date(0) },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, newValue: true },
    }),
  ]);
  const nextReviewAt = last?.nextReviewAt ?? null;
  const legalChangeValue = legalChange?.newValue as {
    description?: unknown;
    source?: unknown;
    detectedAt?: unknown;
  } | null;
  const overdue =
    !last ||
    (nextReviewAt !== null && now > nextReviewAt) ||
    Boolean(relevantIncident) ||
    Boolean(legalChange);
  const report = {
    lastReviewedAt: last?.reviewedAt.toISOString() ?? null,
    lastReviewedBy: last?.reviewedBy ?? null,
    nextReviewAt: nextReviewAt?.toISOString() ?? null,
    reasonForReview: last?.reason ?? null,
    relevantIncidentSinceLastReview: relevantIncident?.id ?? null,
    legalChangeSinceLastReview: legalChange
      ? {
          detectedAt:
            typeof legalChangeValue?.detectedAt === "string"
              ? legalChangeValue.detectedAt
              : legalChange.createdAt.toISOString(),
          description:
            typeof legalChangeValue?.description === "string" ? legalChangeValue.description : null,
          source: typeof legalChangeValue?.source === "string" ? legalChangeValue.source : null,
        }
      : null,
    annualReviewRequired: true,
    overdue,
  };
  if (overdue) {
    await alert(
      "POLICY_REVIEW_OVERDUE",
      legalChange
        ? "Alteração legal desde a última revisão exige nova revisão da política (16)."
        : "Revisão anual da política vencida ou incidente relevante.",
      ipAddress,
      report as never,
    );
  }
  return report;
}

/** 16: mudança legal detectada — dispara revisão mesmo sem decorrido o prazo. */
export async function recordLegalChange(
  actor: Actor,
  input: { description: string; source?: string; detectedAt?: string },
) {
  if (input.description.trim().length < 10) {
    throw validationError("Descreva a alteração legal (mínimo 10 caracteres)");
  }
  const detectedAt = input.detectedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(detectedAt))) {
    throw validationError("detectedAt deve ser uma data ISO válida");
  }
  const audit = await createAuditService().record({
    ...auditActor(actor),
    action: LEGAL_CHANGE_ACTION,
    module: "REPORTS",
    recordType: "PolicyReview",
    result: "SUCCESS",
    newValue: {
      result: "SUCCESS",
      description: input.description.trim(),
      source: input.source?.trim() ?? null,
      detectedAt,
      forcesReview: true,
    },
  });
  await alert(
    "POLICY_REVIEW_OVERDUE",
    "Alteração legal registrada: revisão de política obrigatória (16).",
    actor.ipAddress,
    { description: input.description.trim(), source: input.source?.trim() ?? null },
  );
  return { id: audit.id, detectedAt, forcesReview: true };
}

export async function recordPolicyReview(
  actor: Actor,
  input: { reason: string; notes?: string; type?: PolicyReviewType },
) {
  if (input.reason.trim().length < 10) {
    throw validationError("Informe o motivo da revisão (mínimo 10 caracteres)");
  }
  const type = input.type ?? "ANNUAL";
  const now = new Date();
  const nextReviewAt = new Date(now.getTime() + 365 * 86_400_000);
  const record = await db.policyReview.create({
    data: {
      reviewedAt: now,
      reviewedBy: actor.id,
      reason: input.reason.trim(),
      notes: input.notes?.trim() ?? null,
      nextReviewAt,
    },
  });
  await createAuditService().record({
    ...auditActor(actor),
    action: AUDIT_ACTIONS.POLICY_REVIEW_RECORDED,
    module: "REPORTS",
    recordType: "PolicyReview",
    recordId: record.id,
    result: "SUCCESS",
    newValue: {
      reason: input.reason,
      type,
      nextReviewAt: nextReviewAt.toISOString(),
    },
  });
  return { ...record, type };
}

/** 15: registro de descumprimento e sanção. */
export async function recordPolicyViolation(
  actor: Actor,
  input: {
    userId: string;
    rule: string;
    description: string;
    sanction: string;
    blockAccount?: boolean;
  },
) {
  if (input.description.trim().length < 10 || !input.rule.trim()) {
    throw validationError("Regra e descrição são obrigatórios");
  }
  const sanctions = ["ADVERTENCIA", "BLOQUEIO", "MEDIDA_DISCIPLINAR"];
  if (!sanctions.includes(input.sanction)) {
    throw validationError("Sanção inválida", sanctions);
  }
  const target = await db.user.findUnique({ where: { id: input.userId } });
  if (!target) throw conflict("Usuário não encontrado");

  if (input.sanction === "BLOQUEIO" || input.blockAccount) {
    await db.user.update({
      where: { id: input.userId },
      data: {
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedBy: actor.id,
        blockReason: `Descumprimento: ${input.rule}`,
      },
    });
    await db.session.deleteMany({ where: { userId: input.userId } });
  }

  const record = await db.policyViolation.create({
    data: {
      userId: input.userId,
      rule: input.rule.trim(),
      description: input.description.trim(),
      sanction: input.sanction,
      decidedBy: actor.id,
    },
  });
  await createAuditService().record({
    ...auditActor(actor),
    action: AUDIT_ACTIONS.POLICY_VIOLATION_RECORDED,
    module: "USERS",
    recordType: "PolicyViolation",
    recordId: record.id,
    result: "SUCCESS",
    newValue: { rule: input.rule, sanction: input.sanction, userId: input.userId },
  });
  return record;
}
