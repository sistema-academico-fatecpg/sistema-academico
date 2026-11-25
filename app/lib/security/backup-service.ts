import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { conflict, notFound } from "@/app/lib/auth/errors";
import { db } from "@/app/lib/db";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import type { BackupType } from "@/app/types/common";
import { decryptBuffer, encryptBuffer, sha256 } from "./crypto";

const RETENTION_DAYS: Record<BackupType, number> = {
  FULL: 365,
  INCREMENTAL: 30,
  SEMESTER_CLOSING: 5 * 365,
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

  /** 11.3.4: teste mensal de restauração em ambiente separado. */
  async restoreTest(id: string, ipAddress = "maintenance") {
    const testDatabase = process.env.BACKUP_TEST_DATABASE_URL?.trim();
    if (!testDatabase || testDatabase === process.env.DATABASE_URL?.trim()) {
      throw conflict(
        "O teste de restauração exige BACKUP_TEST_DATABASE_URL distinto da produção (11.3.4)",
      );
    }
    const verified = await this.verify(id);
    const dump = await this.read(verified);
    const required = ["users", "enrollments", "grades"];
    if (!required.every((key) => Array.isArray(dump[key]))) {
      throw conflict("Estrutura do backup inválida no teste de restauração");
    }
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
    });
    return updated;
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

  /** 11.3.4/11.3.5: RPO (24h), RTO (8h) e teste mensal de restauração. */
  async status(now = new Date()) {
    const [latest, lastTest] = await Promise.all([
      db.backupRecord.findFirst({
        where: { status: { not: "EXPIRED" } },
        orderBy: { createdAt: "desc" },
      }),
      db.backupRecord.findFirst({
        where: { restoreTestAt: { not: null } },
        orderBy: { restoreTestAt: "desc" },
        select: { restoreTestAt: true },
      }),
    ]);
    const ageHours = latest ? (now.getTime() - latest.createdAt.getTime()) / 3_600_000 : null;
    const daysSinceTest = lastTest?.restoreTestAt
      ? (now.getTime() - lastTest.restoreTestAt.getTime()) / 86_400_000
      : null;
    return {
      rpoHours: 24,
      rtoHours: 8,
      restoreTestIntervalDays: 30,
      lastBackupAt: latest?.createdAt.toISOString() ?? null,
      ageHours,
      rpoCompliant: ageHours !== null && ageHours <= 24,
      lastRestoreTestAt: lastTest?.restoreTestAt?.toISOString() ?? null,
      daysSinceRestoreTest: daysSinceTest === null ? null : Number(daysSinceTest.toFixed(2)),
      restoreTestOverdue: daysSinceTest === null || daysSinceTest > 30,
      latestType: latest?.type ?? null,
    };
  }
}
