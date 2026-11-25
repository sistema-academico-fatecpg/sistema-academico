import type { z } from "zod";
import { AUDIT_ACTIONS, AuditService } from "@/app/lib/audit/audit-service";
import { deliverActivation } from "@/app/lib/auth/activation";
import { conflict, notFound, validationError } from "@/app/lib/auth/errors";
import { TokenService } from "@/app/lib/auth/tokens";
import type { DbExecutor } from "@/app/lib/db";
import type { CriticalOperationRequestWithUsers } from "@/app/repositories/critical-operation-request.repository";
import { LogRepository } from "@/app/repositories/log.repository";
import { RoleRepository } from "@/app/repositories/role.repository";
import { TokenRepository } from "@/app/repositories/token.repository";
import { UserRepository } from "@/app/repositories/user.repository";
import {
  AcademicRecordDeletionPayloadSchema,
  AdminAccessPayloadSchema,
  DataRestorePayloadSchema,
  EMERGENCY_MASTER_MAX_DAYS,
  EnrollmentExceptionPayloadSchema,
  GradeCorrectionPayloadSchema,
  MassExportPayloadSchema,
  ResetSecondFactorPayloadSchema,
} from "@/app/types/critical-operation";
import { UserInputSchema } from "@/app/types/user";

export type ExecutionActor = {
  id: string;
  ipAddress: string;
};

export type ExecutionResult = {
  summary: string;
  details?: Record<string, unknown>;
};

type Payload = Record<string, unknown>;

function payloadOf(request: CriticalOperationRequestWithUsers): Payload {
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) {
    return {};
  }
  return request.payload as Payload;
}

function parsePayload<T>(schema: z.ZodType<T>, payload: Payload, label: string): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw validationError(`Payload inválido para ${label}`, parsed.error.issues);
  }
  return parsed.data;
}

/**
 * Executa somente os handlers fechados abaixo. O payload armazenado é
 * interpretado, nunca repassado para consultas livres (seção 12.6).
 */
export class CriticalOperationExecutor {
  async execute(
    client: DbExecutor,
    request: CriticalOperationRequestWithUsers,
    actor: ExecutionActor,
  ): Promise<ExecutionResult> {
    const payload = payloadOf(request);

    switch (request.operation) {
      case "GRANT_REVOKE_ADMIN_PERMISSION":
      case "INCLUDE_OR_REPLACE_ADMIN_MASTER":
        return this.executeAdminAccess(client, request, payload, actor);
      case "GRADE_CORRECTION_AFTER_CLOSING":
        return this.executeGradeCorrection(client, payload, actor);
      case "ENROLLMENT_RULE_EXCEPTION":
        return this.executeEnrollmentException(client, payload, actor);
      case "ACADEMIC_RECORD_DELETION":
        return this.executeAcademicRecordDeletion(client, payload);
      case "MASS_PERSONAL_DATA_EXPORT":
        return this.executeMassExport(payload);
      case "DATA_RESTORE_AFTER_INCIDENT":
        return this.executeDataRestore(payload);
      case "RESET_SECOND_FACTOR":
        return this.executeSecondFactorReset(client, payload);
      default:
        throw validationError("Operação crítica sem handler de execução");
    }
  }

  private async executeAdminAccess(
    client: DbExecutor,
    request: CriticalOperationRequestWithUsers,
    payload: Payload,
    actor: ExecutionActor,
  ): Promise<ExecutionResult> {
    const data = parsePayload(AdminAccessPayloadSchema, payload, "acesso administrativo");
    const users = new UserRepository(client);
    const roles = new RoleRepository(client);

    if (data.action === "CREATE_USER") {
      const userInput = UserInputSchema.parse(data.user);
      if (
        request.operation === "INCLUDE_OR_REPLACE_ADMIN_MASTER" &&
        userInput.role !== "ADMIN_MASTER"
      ) {
        throw validationError("A inclusão de Master exige o perfil ADMIN_MASTER");
      }
      if (
        request.operation === "GRANT_REVOKE_ADMIN_PERMISSION" &&
        userInput.role === "ADMIN_MASTER"
      ) {
        throw validationError("Use a operação de inclusão de Admin Master");
      }

      const existing = await users.findByEmail(userInput.email);
      if (existing) throw conflict("E-mail já cadastrado");

      const created = await users.create({
        ...userInput,
        createdBy: actor.id,
        replacesUserId: data.replaceUserId ?? null,
      });

      if (data.emergency) {
        const now = new Date();
        const maxExpiry = new Date(now.getTime() + EMERGENCY_MASTER_MAX_DAYS * 24 * 60 * 60_000);
        const requestedExpiry = data.emergencyExpiresAt
          ? new Date(data.emergencyExpiresAt)
          : maxExpiry;
        const emergencyExpiresAt = requestedExpiry < maxExpiry ? requestedExpiry : maxExpiry;
        if (emergencyExpiresAt.getTime() <= now.getTime()) {
          throw validationError("A validade da conta emergencial deve ser futura");
        }
        await client.user.update({
          where: { id: created.id },
          data: { isEmergency: true, emergencyExpiresAt },
        });
      }

      await deliverActivation(
        { id: created.id, name: created.name, email: created.email },
        new TokenService(new TokenRepository(client)),
      );

      return {
        summary: "Conta administrativa criada sem senha e link de ativação enviado",
        details: {
          userId: created.id,
          role: userInput.role,
          emergency: Boolean(data.emergency),
        },
      };
    }

    // 7.5.4: concessão/revogação de permissões administrativas de um perfil,
    // com log e alerta automático ao Auditor (10.2 e 10.6).
    if (data.action === "SET_ROLE_PERMISSIONS") {
      const role = await roles.findById(data.roleId);
      if (!role) throw notFound("Perfil não encontrado");
      const before = role.permissions.map((item) => item.permission.name).sort();
      const permissions = await client.permission.findMany({
        where: { name: { in: data.permissionNames } },
      });
      const found = new Set(permissions.map((item) => item.name));
      const missing = data.permissionNames.filter((name) => !found.has(name));
      if (missing.length > 0) {
        throw validationError("Permissões inexistentes", missing);
      }
      await client.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (permissions.length > 0) {
        await client.rolePermission.createMany({
          data: permissions.map((item) => ({ roleId: role.id, permissionId: item.id })),
        });
      }
      const after = [...data.permissionNames].sort();
      const txAudit = new AuditService(new LogRepository(client));
      await txAudit.record({
        userId: actor.id as never,
        role: null,
        ipAddress: actor.ipAddress,
        action: AUDIT_ACTIONS.PERMISSIONS_CHANGED,
        module: "ROLES",
        recordType: "Role",
        recordId: role.id,
        result: "SUCCESS",
        oldValue: { permissions: before },
        newValue: { permissions: after },
      });
      return {
        summary: "Permissões do perfil alteradas",
        details: { roleId: role.id, role: role.name, before, after },
      };
    }

    const target = await users.findById(data.userId);
    if (!target) throw notFound("Usuário não encontrado");

    if (request.operation === "INCLUDE_OR_REPLACE_ADMIN_MASTER" && data.role !== "ADMIN_MASTER") {
      throw validationError("Somente Admin Master pode ser incluído por esta operação");
    }
    if (request.operation === "GRANT_REVOKE_ADMIN_PERMISSION" && data.role === "ADMIN_MASTER") {
      throw validationError("Admin Master é gerido pela operação de inclusão de Master");
    }

    const role = await roles.findByName(data.role);
    if (!role) throw notFound("Perfil não encontrado");

    const txAudit = new AuditService(new LogRepository(client));
    const baseEvent = {
      userId: actor.id as never,
      role: null,
      ipAddress: actor.ipAddress,
      module: "ROLES" as const,
      recordType: "User",
      recordId: target.id,
      result: "SUCCESS" as const,
    };

    if (data.action === "ADD_ROLE" || data.action === "ASSIGN_ROLE") {
      await roles.assignRole(target.id, role.id, actor.id);
      await txAudit.record({
        ...baseEvent,
        action: AUDIT_ACTIONS.ROLE_ASSIGNED,
        newValue: { role: data.role },
      });
      return {
        summary: `Perfil ${data.role} atribuído`,
        details: { userId: target.id, role: data.role },
      };
    }

    const activeMasters = await users.countActiveMasters();
    const targetIsMaster = target.roles.some((item) => item.role.name === "ADMIN_MASTER");
    if (data.role === "ADMIN_MASTER" && targetIsMaster && activeMasters <= 1) {
      throw conflict("Não é possível remover o último Admin Master ativo (seção 8.1.4)");
    }

    await roles.removeRole(target.id, role.id);
    await txAudit.record({
      ...baseEvent,
      action: AUDIT_ACTIONS.ROLE_REMOVED,
      oldValue: { role: data.role },
    });
    return {
      summary: `Perfil ${data.role} revogado`,
      details: { userId: target.id, role: data.role },
    };
  }

  private async executeGradeCorrection(
    client: DbExecutor,
    payload: Payload,
    actor: ExecutionActor,
  ): Promise<ExecutionResult> {
    const data = parsePayload(GradeCorrectionPayloadSchema, payload, "correção de nota");
    const grade = await client.grade.findUnique({ where: { enrollmentId: data.enrollmentId } });
    if (!grade) throw notFound("Nota não encontrada");

    await client.grade.update({
      where: { id: grade.id },
      data: { value: data.value, status: "PUBLISHED" },
    });
    await client.gradeHistory.create({
      data: {
        gradeId: grade.id,
        oldValue: grade.value,
        newValue: data.value,
        changedBy: actor.id,
        reason: data.reason,
      },
    });

    return {
      summary: "Nota corrigida após o fechamento com histórico",
      details: { gradeId: grade.id, enrollmentId: data.enrollmentId, value: data.value },
    };
  }

  private async executeEnrollmentException(
    client: DbExecutor,
    payload: Payload,
    actor: ExecutionActor,
  ): Promise<ExecutionResult> {
    const data = parsePayload(EnrollmentExceptionPayloadSchema, payload, "exceção de matrícula");
    const existing = await client.enrollment.findUnique({
      where: {
        studentId_classGroupId: {
          studentId: data.studentId,
          classGroupId: data.classGroupId,
        },
      },
    });
    if (existing) throw conflict("Matrícula já existente para esta turma");

    const enrollment = await client.enrollment.create({
      data: {
        studentId: data.studentId,
        classGroupId: data.classGroupId,
        isDependency: data.isDependency,
        createdBy: actor.id,
        status: "ACTIVE",
      },
    });

    return {
      summary: "Exceção de matrícula aprovada e registrada",
      details: { enrollmentId: enrollment.id, studentId: data.studentId },
    };
  }

  private async executeAcademicRecordDeletion(
    client: DbExecutor,
    payload: Payload,
  ): Promise<ExecutionResult> {
    const data = parsePayload(
      AcademicRecordDeletionPayloadSchema,
      payload,
      "exclusão de registro acadêmico",
    );
    const enrollment = await client.enrollment.findUnique({ where: { id: data.enrollmentId } });
    if (!enrollment) throw notFound("Matrícula não encontrada");

    await client.enrollment.update({
      where: { id: data.enrollmentId },
      data: { status: "CANCELLED" },
    });
    await new AuditService(new LogRepository(client)).record({
      userId: null,
      role: null,
      ipAddress: "system:critical-operation",
      action: AUDIT_ACTIONS.ACADEMIC_RECORD_DELETED,
      module: "ENROLLMENTS",
      recordType: "Enrollment",
      recordId: data.enrollmentId,
      result: "SUCCESS",
      oldValue: { status: enrollment.status },
      newValue: { status: "CANCELLED", reason: data.reason, logical: true },
    });

    return {
      summary: "Registro acadêmico cancelado logicamente (sem exclusão física)",
      details: { enrollmentId: data.enrollmentId, reason: data.reason },
    };
  }

  private executeMassExport(payload: Payload): ExecutionResult {
    const data = parsePayload(MassExportPayloadSchema, payload, "exportação em massa");
    return {
      summary: "Exportação em massa autorizada por dupla aprovação",
      details: { scope: data.scope, filters: data.filters ?? null },
    };
  }

  private executeDataRestore(payload: Payload): ExecutionResult {
    const data = parsePayload(DataRestorePayloadSchema, payload, "restauração de dados");
    return {
      summary: "Restauração de dados autorizada por dupla aprovação",
      details: {
        backupId: data.backupId,
        restorePoint: data.restorePoint ?? null,
        incidentId: data.incidentId ?? null,
      },
    };
  }

  private async executeSecondFactorReset(
    client: DbExecutor,
    payload: Payload,
  ): Promise<ExecutionResult> {
    const data = parsePayload(
      ResetSecondFactorPayloadSchema,
      payload,
      "redefinição de segundo fator",
    );
    const user = await client.user.findUnique({ where: { id: data.userId } });
    if (!user) throw notFound("Usuário não encontrado");

    await client.twoFactor.deleteMany({ where: { userId: data.userId } });
    await client.mfaRecoveryCode.deleteMany({ where: { userId: data.userId } });
    await client.user.update({
      where: { id: data.userId },
      data: { twoFactorEnabled: false },
    });
    await client.session.deleteMany({ where: { userId: data.userId } });

    return {
      summary: "Segundo fator redefinido após aprovação; sessões encerradas",
      details: { userId: data.userId },
    };
  }
}
