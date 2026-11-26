import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { conflict, forbidden, notFound } from "@/app/lib/auth/errors";
import { db } from "@/app/lib/db";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import { MassExportPayloadSchema } from "@/app/types/critical-operation";
import type { AcademicActor } from "./enrollment-service";

export type ExportScope = "ENROLLMENTS" | "GRADES" | "USERS";

type ExportFilters = {
  studentId?: string;
  classGroupId?: string;
  status?: string;
};

function filtersOf(value: unknown): ExportFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    studentId: typeof raw.studentId === "string" ? raw.studentId : undefined,
    classGroupId: typeof raw.classGroupId === "string" ? raw.classGroupId : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  };
}

export class ExportService {
  constructor(
    private readonly requests = new CriticalOperationRequestRepository(),
    private readonly audit = createAuditService(),
  ) {}

  private async rows(
    scope: ExportScope,
    filters: ExportFilters,
  ): Promise<Record<string, unknown>[]> {
    if (scope === "ENROLLMENTS") {
      const items = await db.enrollment.findMany({
        where: {
          ...(filters.studentId ? { studentId: filters.studentId } : {}),
          ...(filters.classGroupId ? { classGroupId: filters.classGroupId } : {}),
        },
        include: {
          student: { select: { name: true, socialName: true, registrationNumber: true } },
          classGroup: { include: { subject: { select: { code: true, name: true } } } },
        },
        take: 5000,
      });
      return items.map((item) => ({
        enrollmentId: item.id,
        student: item.student.socialName || item.student.name,
        registrationNumber: item.student.registrationNumber,
        subjectCode: item.classGroup.subject.code,
        subjectName: item.classGroup.subject.name,
        status: item.status,
        isDependency: item.isDependency,
      }));
    }

    if (scope === "GRADES") {
      const items = await db.grade.findMany({
        where: {
          ...(filters.studentId ? { enrollment: { studentId: filters.studentId } } : {}),
          ...(filters.classGroupId ? { enrollment: { classGroupId: filters.classGroupId } } : {}),
        },
        include: {
          enrollment: {
            include: {
              student: { select: { name: true, socialName: true, registrationNumber: true } },
              classGroup: { include: { subject: { select: { code: true, name: true } } } },
            },
          },
        },
        take: 5000,
      });
      return items.map((item) => ({
        enrollmentId: item.enrollmentId,
        student: item.enrollment.student.socialName || item.enrollment.student.name,
        registrationNumber: item.enrollment.student.registrationNumber,
        subjectCode: item.enrollment.classGroup.subject.code,
        subjectName: item.enrollment.classGroup.subject.name,
        value: item.value ? Number(item.value) : null,
        status: item.status,
      }));
    }

    const items = await db.user.findMany({
      where: filters.status ? { status: filters.status as never } : {},
      include: { roles: { include: { role: { select: { name: true } } } } },
      take: 5000,
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      status: item.status,
      roles: item.roles.map((entry) => entry.role.name),
    }));
  }

  /** 9.4.1: exportação comum é auditada e limitada por permissão na rota. */
  async simpleExport(
    actor: AcademicActor,
    scope: ExportScope,
    filters: ExportFilters,
  ): Promise<Record<string, unknown>[]> {
    const data = await this.rows(scope, filters);
    await this.audit.record({
      ...auditActor(actor),
      action: AUDIT_ACTIONS.EXPORT,
      module: "REPORTS",
      recordType: scope,
      result: "SUCCESS",
      newValue: { scope, filters, count: data.length },
    });
    return data;
  }

  /** 9.4.2: exportação em massa só após solicitação EXECUTED (7.5). */
  async massExport(actor: AcademicActor, requestId: string): Promise<Record<string, unknown>[]> {
    const request = await this.requests.findById(requestId);
    if (!request) throw notFound("Solicitação não encontrada");
    if (request.operation !== "MASS_PERSONAL_DATA_EXPORT" || request.status !== "EXECUTED") {
      throw conflict("Exportação em massa exige solicitação aprovada e executada");
    }
    if (request.requestedBy !== actor.id && !actor.roles.includes("ADMIN_MASTER")) {
      throw forbidden("Somente o solicitante ou um Admin Master pode baixar o relatório");
    }

    const payload = MassExportPayloadSchema.parse(request.payload ?? {});
    const data = await this.rows(payload.scope, filtersOf(payload.filters));
    await this.audit.record({
      ...auditActor(actor),
      action: AUDIT_ACTIONS.MASS_EXPORT,
      module: "REPORTS",
      recordType: "CriticalOperationRequest",
      recordId: request.id,
      result: "SUCCESS",
      newValue: { scope: payload.scope, count: data.length },
    });
    return data;
  }
}
