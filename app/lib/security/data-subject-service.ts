import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { conflict, forbidden, notFound } from "@/app/lib/auth/errors";
import { db } from "@/app/lib/db";
import { SensitiveDataService } from "@/app/lib/security/sensitive-data-service";
import type { DataSubjectRequestInput } from "@/app/types/lgpd";
import type { SensitiveActor } from "./sensitive-data-service";

export class DataSubjectService {
  constructor(
    private readonly sensitive = new SensitiveDataService(),
    private readonly audit = createAuditService(),
  ) {}

  /** 11.1.4: consulta e cópia dos próprios dados, sem qualquer id externo. */
  async ownData(actor: SensitiveActor) {
    const user = await db.user.findUnique({
      where: { id: actor.id },
      include: {
        roles: { include: { role: { select: { name: true } } } },
        studentProfile: true,
      },
    });
    if (!user) throw notFound("Titular não encontrado");
    const enrollments = await db.enrollment.findMany({
      where: { studentId: actor.id },
      include: {
        classGroup: { include: { subject: { select: { code: true, name: true } } } },
        grade: true,
      },
    });
    return {
      id: user.id,
      name: user.name,
      socialName: user.socialName,
      email: user.email,
      personalEmail: user.personalEmail,
      registrationNumber: user.registrationNumber,
      roles: user.roles.map((item) => item.role.name),
      guardianConsentAt: user.studentProfile?.guardianConsentAt ?? null,
      enrollments: enrollments.map((item) => ({
        subjectCode: item.classGroup.subject.code,
        subjectName: item.classGroup.subject.name,
        status: item.status,
        grade: item.grade?.value ? Number(item.grade.value) : null,
      })),
      sensitiveData: await this.sensitive.maskedForUser(actor.id),
    };
  }

  async request(actor: SensitiveActor, input: DataSubjectRequestInput) {
    const record = await db.dataSubjectRequest.create({
      data: {
        userId: actor.id,
        type: input.type,
        reason: input.reason,
        payload: input.payload ?? undefined,
      },
    });
    await this.audit.record({
      userId: actor.id as never,
      role: (actor.roles[0] ?? null) as never,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.DATA_SUBJECT_REQUESTED,
      module: "USERS",
      recordType: "DataSubjectRequest",
      recordId: record.id,
      result: "SUCCESS",
      newValue: { type: input.type },
    });
    return record;
  }

  async decide(actor: SensitiveActor, id: string, decision: "APPROVE" | "REJECT") {
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      throw forbidden("Pedido de titular decidido pelo Admin Master ou pelo Auditor/DPO");
    }
    const record = await db.dataSubjectRequest.findUnique({ where: { id } });
    if (!record) throw notFound("Pedido não encontrado");
    if (record.status !== "PENDING") throw conflict("Pedido já decidido");

    if (decision === "REJECT") {
      const updated = await db.dataSubjectRequest.update({
        where: { id },
        data: { status: "REJECTED", decidedBy: actor.id, decidedAt: new Date() },
      });
      return updated;
    }

    if (record.type === "CORRECTION") {
      const payload = record.payload as Record<string, unknown> | null;
      await db.user.update({
        where: { id: record.userId },
        data: {
          ...(typeof payload?.socialName === "string" || payload?.socialName === null
            ? { socialName: payload.socialName as string | null }
            : {}),
          ...(typeof payload?.personalEmail === "string" || payload?.personalEmail === null
            ? { personalEmail: payload.personalEmail as string | null }
            : {}),
        },
      });
    }

    if (record.type === "ELIMINATION") {
      // 11.1.6: anonimiza dados pessoais, preservando acervo acadêmico e logs.
      await db.user.update({
        where: { id: record.userId },
        data: {
          name: "Titular anonimizado",
          socialName: null,
          email: `anonimo-${record.userId}@invalid.local`,
          personalEmail: null,
          registrationNumber: null,
          status: "INACTIVE",
          deactivatedAt: new Date(),
          deactivatedBy: actor.id,
        },
      });
      await db.session.deleteMany({ where: { userId: record.userId } });
      await db.token.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await db.sensitiveData.deleteMany({ where: { userId: record.userId } });
    }

    const updated = await db.dataSubjectRequest.update({
      where: { id },
      data: { status: "COMPLETED", decidedBy: actor.id, decidedAt: new Date() },
    });
    await this.audit.record({
      userId: actor.id as never,
      role: (actor.roles[0] ?? null) as never,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.DATA_SUBJECT_COMPLETED,
      module: "USERS",
      recordType: "DataSubjectRequest",
      recordId: id,
      result: "SUCCESS",
      newValue: { type: record.type, decision },
    });
    return updated;
  }

  /** 11.1.3: consentimento de responsável legal para dados de menores. */
  async recordGuardianConsent(
    actor: SensitiveActor,
    studentId: string,
    guardianName: string,
  ): Promise<void> {
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("ADMIN_SECUNDARIO")) {
      throw forbidden("Consentimento registrado pela secretaria/coordenação");
    }
    const profile = await db.studentProfile.findUnique({ where: { userId: studentId } });
    if (!profile) throw notFound("Perfil de aluno não encontrado");
    await db.studentProfile.update({
      where: { userId: studentId },
      data: { guardianName, guardianConsentAt: new Date() },
    });
    await this.audit.record({
      userId: actor.id as never,
      role: (actor.roles[0] ?? null) as never,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.GUARDIAN_CONSENT_RECORDED,
      module: "USERS",
      recordType: "StudentProfile",
      recordId: studentId,
      result: "SUCCESS",
      newValue: { guardianName },
    });
  }
}
