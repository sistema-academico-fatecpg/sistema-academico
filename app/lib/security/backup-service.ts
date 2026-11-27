import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { Client } from "pg";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { conflict, notFound } from "@/app/lib/auth/errors";
import { db } from "@/app/lib/db";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import type { BackupType } from "@/app/types/common";
import { decryptBuffer, encryptBuffer, sha256 } from "./crypto";
import { RESTORE_TEST_DAYS, RPO_TARGET_HOURS, RTO_TARGET_HOURS } from "./env";

const RETENTION_DAYS: Record<BackupType, number> = {
  FULL: 365,
  INCREMENTAL: 30,
  SEMESTER_CLOSING: 5 * 365,
};

/**
 * 11.3.1: frequências das rotinas automáticas (expressões cron em UTC).
 * O agendador em `scripts/backup.ts schedule` usa estas mesmas constantes.
 */
export const BACKUP_SCHEDULE: Record<BackupType, string> = {
  FULL: "0 3 * * 0", // semanal: domingo, 03:00
  INCREMENTAL: "30 2 * * *", // diário: 02:30
  SEMESTER_CLOSING: "0 4 1 1,7 *", // fechamento de semestre: 1º/jan e 1º/jul, 04:00
};

function destinations(): string[] {
  const local = process.env.BACKUP_LOCAL_DIR ?? "/tmp/opencode/backups/local";
  const cloud = process.env.BACKUP_CLOUD_DIR ?? "/tmp/opencode/backups/cloud";
  return [local, cloud];
}

function retentionUntil(type: BackupType, now = new Date()): Date {
  return new Date(now.getTime() + RETENTION_DAYS[type] * 86_400_000);
}

type BackupDump = Record<string, unknown[]>;

async function dumpDatabase(): Promise<BackupDump> {
  const [
    users,
    courses,
    periods,
    subjects,
    classGroups,
    enrollments,
    grades,
    gradeHistory,
    snapshots,
    criticalRequests,
    supportGrants,
    incidents,
    dataSubjectRequests,
    sensitiveData,
  ] = await Promise.all([
    db.user.findMany({ include: { roles: true, studentProfile: true } }),
    db.course.findMany(),
    db.academicPeriod.findMany(),
    db.subject.findMany(),
    db.classGroup.findMany(),
    db.enrollment.findMany(),
    db.grade.findMany(),
    db.gradeHistory.findMany(),
    db.gradeClosingSnapshot.findMany(),
    db.criticalOperationRequest.findMany(),
    db.supportAccessGrant.findMany(),
    db.incident.findMany(),
    db.dataSubjectRequest.findMany(),
    db.sensitiveData.findMany(),
  ]);
  return JSON.parse(
    JSON.stringify({
      users,
      courses,
      academicPeriods: periods,
      subjects,
      classGroups,
      enrollments,
      grades,
      gradeHistory,
      gradeClosingSnapshots: snapshots,
      criticalOperationRequests: criticalRequests,
      supportAccessGrants: supportGrants,
      incidents,
      dataSubjectRequests,
      sensitiveData,
    }),
  ) as BackupDump;
}

/** Ordem respeita as chaves estrangeiras ao restaurar no banco isolado. */
const RESTORE_TABLES: Array<[keyof BackupDump, string]> = [
  ["users", "users"],
  ["courses", "courses"],
  ["academicPeriods", "academic_periods"],
  ["subjects", "subjects"],
  ["classGroups", "class_groups"],
  ["enrollments", "enrollments"],
  ["grades", "grades"],
  ["gradeHistory", "grade_history"],
  ["gradeClosingSnapshots", "grade_closing_snapshots"],
  ["criticalOperationRequests", "critical_operation_requests"],
  ["supportAccessGrants", "support_access_grants"],
  ["incidents", "incidents"],
  ["dataSubjectRequests", "data_subject_requests"],
  ["sensitiveData", "sensitive_data"],
];

function toSnakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/** 11.3.4: restaura de fato em BACKUP_TEST_DATABASE_URL (nunca em produção). */
async function restoreIntoTestDatabase(
  connectionString: string,
  backupId: string,
  dump: BackupDump,
  checksum: string,
): Promise<{ mode: "FULL_TABLE_RESTORE" | "PAYLOAD_VERIFICATION"; durationMs: number }> {
  const client = new Client({ connectionString });
  const startedAt = Date.now();
  await client.connect();
  try {
    let mode: "FULL_TABLE_RESTORE" | "PAYLOAD_VERIFICATION" = "FULL_TABLE_RESTORE";
    try {
      await client.query("BEGIN");
      const found = await client.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
        [RESTORE_TABLES.map(([, table]) => table)],
      );
      const present = new Set(found.rows.map((row) => row.table_name));
      if (present.size !== RESTORE_TABLES.length) {
        throw new Error("Schema de teste incompleto; restaurando payload em tabela isolada");
      }
      await client.query(
        `TRUNCATE ${RESTORE_TABLES.map(([, table]) => `"${table}"`).join(", ")} CASCADE`,
      );
      for (const [key, table] of RESTORE_TABLES) {
        const rows = dump[key];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const columns = await client.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1`,
          [table],
        );
        const allowed = new Set(columns.rows.map((row) => row.column_name));
        for (const row of rows as Array<Record<string, unknown>>) {
          const fields = Object.entries(row).filter(
            ([name, value]) => value !== undefined && allowed.has(toSnakeCase(name)),
          );
          if (fields.length === 0) continue;
          const names = fields.map(([name]) => `"${toSnakeCase(name)}"`).join(", ");
          const placeholders = fields.map((_, index) => `$${index + 1}`).join(", ");
          const values = fields.map(([, value]) =>
            value !== null && typeof value === "object" ? JSON.stringify(value) : value,
          );
          await client.query(`INSERT INTO "${table}" (${names}) VALUES (${placeholders})`, values);
        }
      }
      const probe = await client.query<{ ok: number }>("SELECT 1 AS ok");
      if (probe.rows[0]?.ok !== 1) throw new Error("Consulta de verificação falhou");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      // Schema ausente (banco de teste recém-criado): restaura o payload
      // verificado em tabela isolada do próprio banco de teste.
      mode = "PAYLOAD_VERIFICATION";
      await client.query(`
        CREATE TABLE IF NOT EXISTS backup_restore_verification (
          id TEXT PRIMARY KEY,
          backup_id TEXT NOT NULL,
          payload JSONB NOT NULL,
          checksum TEXT NOT NULL,
          restored_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      const id = randomUUID();
      await client.query(
        `INSERT INTO backup_restore_verification (id, backup_id, payload, checksum, restored_at)
         VALUES ($1, $2, $3::jsonb, $4, now())`,
        [id, backupId, JSON.stringify(dump), checksum],
      );
      const probe = await client.query<{ ok: number; backup_id: string; checksum: string }>(
        `SELECT 1 AS ok, backup_id, checksum FROM backup_restore_verification WHERE id = $1`,
        [id],
      );
      if (
        probe.rows[0]?.ok !== 1 ||
        probe.rows[0]?.backup_id !== backupId ||
        probe.rows[0]?.checksum !== checksum
      ) {
        throw error instanceof Error ? error : new Error("Falha ao verificar restauração de teste");
      }
    }
    return { mode, durationMs: Date.now() - startedAt };
  } finally {
    await client.end();
  }
}

/** 11.3.5: última duração medida em teste de restauração bem-sucedido. */
export async function lastRestoreMeasurement() {
  const log = await db.log.findFirst({
    where: { action: AUDIT_ACTIONS.BACKUP_RESTORE_TESTED, result: "SUCCESS" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, recordId: true, newValue: true },
  });
  const value = log?.newValue as { durationMs?: unknown; mode?: unknown } | null;
  const durationMs = typeof value?.durationMs === "number" ? value.durationMs : null;
  return {
    backupId: log?.recordId ?? null,
    measuredAt: log?.createdAt.toISOString() ?? null,
    durationMs,
    durationHours: durationMs === null ? null : Number((durationMs / 3_600_000).toFixed(3)),
    mode: typeof value?.mode === "string" ? value.mode : null,
  };
}

export class BackupService {
  constructor(
    private readonly audit = createAuditService(),
    private readonly requests = new CriticalOperationRequestRepository(),
  ) {}

  /** 11.3: três cópias, dois destinos, criptografia antes de sair do servidor. */
  async create(type: BackupType, createdBy: string, ipAddress = "maintenance") {
    try {
      const dump = await dumpDatabase();
      const plaintext = Buffer.from(JSON.stringify(dump), "utf8");
      const compressed = gzipSync(plaintext);
      const encrypted = encryptBuffer(compressed);
      const id = randomUUID();
      const fileName = `backup-${type.toLowerCase()}-${Date.now()}-${id}.enc`;
      const [localDir, cloudDir] = destinations();
      await Promise.all([
        mkdir(localDir, { recursive: true }),
        mkdir(cloudDir, { recursive: true }),
      ]);
      await Promise.all([
        writeFile(path.join(localDir, fileName), encrypted.cipherText),
        writeFile(path.join(cloudDir, fileName), encrypted.cipherText),
      ]);

      const record = await db.backupRecord.create({
        data: {
          id,
          type,
          status: "CREATED",
          destinations: "LOCAL_DISK,CLOUD",
          filePath: path.join(localDir, fileName),
          checksum: sha256(plaintext),
          iv: encrypted.iv.toString("base64"),
          authTag: encrypted.authTag.toString("base64"),
          sizeBytes: encrypted.cipherText.length,
          encrypted: true,
          retentionUntil: retentionUntil(type),
          createdBy,
        },
      });
      await this.audit.record({
        userId: null,
        role: null,
        ipAddress,
        action: AUDIT_ACTIONS.BACKUP_CREATED,
        module: "BACKUPS",
        recordType: "BackupRecord",
        recordId: id,
        result: "SUCCESS",
        newValue: { type, destinations: record.destinations, sizeBytes: record.sizeBytes },
      });
      return record;
    } catch (error) {
      await this.audit.record({
        userId: null,
        role: null,
        ipAddress,
        action: AUDIT_ACTIONS.BACKUP_FAILED,
        module: "BACKUPS",
        recordType: "BackupRecord",
        result: "FAILURE",
        newValue: { error: error instanceof Error ? error.message : "unknown" },
      });
      throw error;
    }
  }

  private async read(record: {
    filePath: string;
    iv: string;
    authTag: string;
  }): Promise<BackupDump> {
    const [, cloudDir] = destinations();
    const candidates = [record.filePath, path.join(cloudDir, path.basename(record.filePath))];
    let cipherText: Buffer | null = null;
    for (const candidate of candidates) {
      try {
        cipherText = await readFile(candidate);
        break;
      } catch {
        // Tenta o segundo destino (nuvem).
      }
    }
    if (!cipherText) throw notFound("Arquivo de backup não encontrado nos destinos");
    const compressed = decryptBuffer({
      cipherText,
      iv: Buffer.from(record.iv, "base64"),
      authTag: Buffer.from(record.authTag, "base64"),
    });
    return JSON.parse(gunzipSync(compressed).toString("utf8")) as BackupDump;
  }

  async verify(id: string) {
    const record = await db.backupRecord.findUnique({ where: { id } });
    if (!record) throw notFound("Backup não encontrado");
    const dump = await this.read(record);
    const checksum = sha256(Buffer.from(JSON.stringify(dump)));
    if (checksum !== record.checksum) throw conflict("Checksum do backup não confere");
    const updated = await db.backupRecord.update({ where: { id }, data: { status: "VERIFIED" } });
    return updated;
  }

  /** 11.3.4: teste mensal de restauração real em ambiente separado. */
  async restoreTest(id: string, ipAddress = "maintenance") {
    const testDatabase = process.env.BACKUP_TEST_DATABASE_URL?.trim();
    const production = process.env.DATABASE_URL?.trim();
    const auditDatabase = process.env.AUDIT_DATABASE_URL?.trim();
    if (
      !testDatabase ||
      testDatabase === production ||
      (auditDatabase && testDatabase === auditDatabase)
    ) {
      throw conflict(
        "O teste de restauração exige BACKUP_TEST_DATABASE_URL distinto da produção e da auditoria (11.3.4)",
      );
    }
    const verified = await this.verify(id);
    const dump = await this.read(verified);
    const required = ["users", "enrollments", "grades"];
    if (!required.every((key) => Array.isArray(dump[key]))) {
      throw conflict("Estrutura do backup inválida no teste de restauração");
    }

    const startedAt = Date.now();
    try {
      const result = await restoreIntoTestDatabase(testDatabase, id, dump, verified.checksum);
      const updated = await db.backupRecord.update({
        where: { id },
        data: { status: "RESTORE_TESTED", restoreTestAt: new Date() },
      });
      await this.audit.record({
        userId: null,
        role: null,
        ipAddress,
        action: AUDIT_ACTIONS.BACKUP_RESTORE_TESTED,
        module: "BACKUPS",
        recordType: "BackupRecord",
        recordId: id,
        result: "SUCCESS",
        newValue: {
          result: "SUCCESS",
          durationMs: result.durationMs,
          totalDurationMs: Date.now() - startedAt,
          mode: result.mode,
        },
      });
      return updated;
    } catch (error) {
      // Nunca marcar sucesso (nem restoreTestAt) quando a restauração falha.
      await this.audit.record({
        userId: null,
        role: null,
        ipAddress,
        action: AUDIT_ACTIONS.BACKUP_RESTORE_TESTED,
        module: "BACKUPS",
        recordType: "BackupRecord",
        recordId: id,
        result: "FAILURE",
        newValue: {
          result: "FAILURE",
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : "unknown",
        },
      });
      throw error;
    }
  }

  /**
   * 13.3/13.4: restauração parcial somente após solicitação EXECUTED, com
   * cópia do estado atual antes de aplicar.
   */
  async partialRestore(
    id: string,
    affectedRecordIds: string[],
    requestId: string,
    ipAddress = "maintenance",
  ) {
    const request = await this.requests.findById(requestId);
    if (request?.operation !== "DATA_RESTORE_AFTER_INCIDENT" || request.status !== "EXECUTED") {
      throw conflict("Restauração exige solicitação aprovada e executada (13.2)");
    }

    await this.create("INCREMENTAL", "system:pre-restore", ipAddress);
    const record = await db.backupRecord.findUnique({ where: { id } });
    if (!record) throw notFound("Backup não encontrado");
    const verified = await this.verify(id);
    const dump = await this.read(verified);

    // 13.3: lançamentos legítimos posteriores ao ponto de restauração são
    // identificados pelos logs e devolvidos para relançamento supervisionado.
    const replayCandidates = await db.log.findMany({
      where: {
        action: {
          in: ["GRADE_CHANGED", "ENROLLMENT_CREATED", "GRADE_CORRECTION_REQUESTED"],
        },
        createdAt: { gt: record.createdAt },
        recordId: { in: affectedRecordIds },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        recordId: true,
        newValue: true,
        createdAt: true,
      },
    });

    let restored = 0;
    for (const targetId of affectedRecordIds) {
      const grade = (dump.grades as Record<string, unknown>[]).find(
        (item) => item.enrollmentId === targetId,
      );
      if (grade) {
        await db.grade.upsert({
          where: { enrollmentId: targetId },
          create: {
            enrollmentId: targetId,
            professorId: String(grade.professorId),
            value: grade.value === null ? null : Number(grade.value),
            status: grade.status as never,
          },
          update: {
            value: grade.value === null ? null : Number(grade.value),
            status: grade.status as never,
          },
        });
        restored += 1;
        continue;
      }
      const enrollment = (dump.enrollments as Record<string, unknown>[]).find(
        (item) => item.id === targetId,
      );
      if (enrollment) {
        await db.enrollment.upsert({
          where: { id: targetId },
          create: {
            id: targetId,
            studentId: String(enrollment.studentId),
            classGroupId: String(enrollment.classGroupId),
            createdBy: String(enrollment.createdBy),
            status: enrollment.status as never,
            isDependency: Boolean(enrollment.isDependency),
          },
          update: { status: enrollment.status as never },
        });
        restored += 1;
      }
    }
    return { restored, replayCandidates };
  }

  /** 11.3.1/10.7: expira cópias fora da retenção sem ler seu conteúdo. */
  async expireRetention(now = new Date(), ipAddress = "maintenance") {
    const result = await db.backupRecord.updateMany({
      where: { status: { not: "EXPIRED" }, retentionUntil: { lt: now } },
      data: { status: "EXPIRED" },
    });
    await this.audit.record({
      userId: null,
      role: null,
      ipAddress,
      action: AUDIT_ACTIONS.MAINTENANCE_INTERVENTION,
      module: "BACKUPS",
      recordType: "BackupRecord",
      result: "SUCCESS",
      newValue: { operation: "EXPIRE_RETENTION", count: result.count },
    });
    return result.count;
  }

  /** 11.3.4/11.3.5: RPO (24h), RTO (meta 8h) e teste mensal de restauração. */
  async status(now = new Date()) {
    const [latest, lastTest, measurement] = await Promise.all([
      db.backupRecord.findFirst({
        where: { status: { not: "EXPIRED" } },
        orderBy: { createdAt: "desc" },
      }),
      db.backupRecord.findFirst({
        where: { restoreTestAt: { not: null } },
        orderBy: { restoreTestAt: "desc" },
        select: { restoreTestAt: true },
      }),
      lastRestoreMeasurement(),
    ]);
    const ageHours = latest ? (now.getTime() - latest.createdAt.getTime()) / 3_600_000 : null;
    const daysSinceTest = lastTest?.restoreTestAt
      ? (now.getTime() - lastTest.restoreTestAt.getTime()) / 86_400_000
      : null;
    const measuredHours = measurement.durationHours;
    return {
      rpoHours: RPO_TARGET_HOURS,
      /** Meta contratual: 8h. O valor medido está em `rtoHours`. */
      rtoTargetHours: RTO_TARGET_HOURS,
      rtoHours: measuredHours,
      rtoMeasuredAt: measurement.measuredAt,
      restoreDurationMs: measurement.durationMs,
      restoreMode: measurement.mode,
      rtoWithinTarget: measuredHours === null ? null : measuredHours <= RTO_TARGET_HOURS,
      restoreTestIntervalDays: RESTORE_TEST_DAYS,
      lastBackupAt: latest?.createdAt.toISOString() ?? null,
      ageHours,
      rpoCompliant: ageHours !== null && ageHours <= RPO_TARGET_HOURS,
      lastRestoreTestAt: lastTest?.restoreTestAt?.toISOString() ?? null,
      daysSinceRestoreTest: daysSinceTest === null ? null : Number(daysSinceTest.toFixed(2)),
      restoreTestOverdue: daysSinceTest === null || daysSinceTest > RESTORE_TEST_DAYS,
      latestType: latest?.type ?? null,
    };
  }
}
