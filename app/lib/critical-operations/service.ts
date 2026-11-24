import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, AuditService } from "@/app/lib/audit/audit-service";
import { conflict, forbidden, notFound } from "@/app/lib/auth/errors";
import { withTransaction } from "@/app/lib/db";
import {
  CriticalOperationRequestRepository,
  type CriticalOperationRequestWithUsers,
} from "@/app/repositories/critical-operation-request.repository";
import { LogRepository } from "@/app/repositories/log.repository";
import { UserRepository } from "@/app/repositories/user.repository";
import type { RoleName, UserId } from "@/app/types/common";
import {
  ApprovalDecisionSchema,
  CriticalOperationPayloadSchemas,
  type CriticalOperationRequestInput,
  CriticalOperationRequestInputSchema,
} from "@/app/types/critical-operation";
import {
  CRITICAL_OPERATION_PERMISSION,
  hasPermission,
  PERMISSIONS,
  type Permission,
} from "@/app/types/roles";
import { CriticalOperationExecutor } from "./executor";

export type CriticalOperationActor = {
  id: string;
  roles: readonly RoleName[];
  ipAddress: string;
  /** Permissões efetivas do banco; quando ausente usa a matriz estática. */
  permissions?: ReadonlySet<Permission>;
};

export type MasterStatus = {
  activeMasters: number;
  singleAccountMode: boolean;
  masterInclusionOnly: boolean;
};

export type DecideResult = {
  request: CriticalOperationRequestWithUsers;
  executed: boolean;
};

function auditUserId(value: string | null | undefined): UserId | null {
  return (value ?? null) as UserId | null;
}

function actorHas(actor: CriticalOperationActor, permission: Permission): boolean {
  return actor.permissions
    ? actor.permissions.has(permission)
    : hasPermission(actor.roles, permission);
}

function isMasterInclusion(request: Pick<CriticalOperationRequestWithUsers, "operation">): boolean {
  return request.operation === "INCLUDE_OR_REPLACE_ADMIN_MASTER";
}

function requestIsEmergency(request: CriticalOperationRequestWithUsers): boolean {
  const payload = request.payload;
  return Boolean(
    payload && typeof payload === "object" && !Array.isArray(payload) && payload.emergency === true,
  );
}

/**
 * Fluxo de dupla aprovação (seções 7.5, 7.6 e 8.8).
 *
 * - A permissão define quem pode solicitar; a aprovação é sempre de outra
 *   pessoa, nunca do solicitante.
 * - Em modo de conta única, somente a inclusão de Admin Master é permitida e a
 *   aprovação cabe ao Auditor. As demais operações ficam suspensas.
 * - A execução acontece dentro da mesma transação da aprovação: ou o handler
 *   roda e o pedido passa a EXECUTED, ou tudo é revertido.
 */
export class CriticalOperationService {
  constructor(
    private readonly requests = new CriticalOperationRequestRepository(),
    private readonly users = new UserRepository(),
    private readonly audit = createAuditService(),
    private readonly executor = new CriticalOperationExecutor(),
  ) {}

  async masterStatus(): Promise<MasterStatus> {
    const activeMasters = await this.users.countActiveMasters();
    return {
      activeMasters,
      singleAccountMode: activeMasters < 2,
      masterInclusionOnly: activeMasters < 2,
    };
  }

  async request(
    actor: CriticalOperationActor,
    input: CriticalOperationRequestInput,
  ): Promise<CriticalOperationRequestWithUsers> {
    const parsed = CriticalOperationRequestInputSchema.parse(input);
    const required = CRITICAL_OPERATION_PERMISSION[parsed.operation];
    if (!actorHas(actor, required)) {
      throw forbidden(`Permissão ${required} necessária para solicitar esta operação`);
    }

    const payloadSchema = CriticalOperationPayloadSchemas[parsed.operation];
    payloadSchema.parse(parsed.payload ?? {});

    if (parsed.operation === "INCLUDE_OR_REPLACE_ADMIN_MASTER") {
      if (!actor.roles.includes("ADMIN_MASTER")) {
        throw forbidden("Somente Admin Master pode solicitar inclusão de Master");
      }
    }

    const status = await this.masterStatus();
    if (status.singleAccountMode && !isMasterInclusion(parsed)) {
      throw conflict(
        "Modo de conta única: operações críticas suspensas até que existam dois Admins Master ativos (seção 8.8.1)",
      );
    }

    const created = await this.requests.create(actor.id, parsed);
    const request = await this.requests.findById(created.id);
    if (!request) throw notFound("Solicitação não encontrada após criação");

    await this.audit.record({
      userId: auditUserId(actor.id),
      role: actor.roles[0] ?? null,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.CRITICAL_OPERATION_REQUESTED,
      module: parsed.module ?? "USERS",
      recordType: parsed.recordType ?? "CriticalOperationRequest",
      recordId: request.id,
      result: "SUCCESS",
      newValue: {
        operation: parsed.operation,
        reason: parsed.reason,
        authorizationDocument: parsed.authorizationDocument ?? null,
      },
    });

    if (status.singleAccountMode && isMasterInclusion(parsed)) {
      await this.audit.record({
        userId: auditUserId(actor.id),
        role: actor.roles[0] ?? null,
        ipAddress: actor.ipAddress,
        action: AUDIT_ACTIONS.MASTER_ACCOUNTS_BELOW_MINIMUM,
        module: "USERS",
        recordType: "CriticalOperationRequest",
        recordId: request.id,
        result: "SUCCESS",
        newValue: { activeMasters: status.activeMasters },
      });
    }

    return request;
  }

  async decide(
    requestId: string,
    decision: { decision: "APPROVE" | "REJECT"; reason?: string },
    actor: CriticalOperationActor,
  ): Promise<DecideResult> {
    const parsed = ApprovalDecisionSchema.parse(decision);
    const request = await this.requests.findById(requestId);
    if (!request) throw notFound("Solicitação não encontrada");
    if (request.status !== "PENDING") {
      throw conflict("Solicitação já decidida");
    }

    if (request.requestedBy === actor.id) {
      await this.audit.record({
        userId: auditUserId(actor.id),
        role: actor.roles[0] ?? null,
        ipAddress: actor.ipAddress,
        action: AUDIT_ACTIONS.SELF_APPROVAL_ATTEMPT,
        module: request.module ?? "USERS",
        recordType: "CriticalOperationRequest",
        recordId: request.id,
        result: "FAILURE",
        newValue: { operation: request.operation },
      });
      throw forbidden("O solicitante não pode aprovar a própria solicitação (seção 7.5.2)");
    }

    const status = await this.masterStatus();
    const masterInclusion = isMasterInclusion(request);
    if (status.singleAccountMode && !masterInclusion) {
      throw conflict(
        "Modo de conta única: somente a inclusão de Admin Master pode ser aprovada (seção 8.8.1)",
      );
    }

    const auditorApproval =
      masterInclusion && (status.singleAccountMode || requestIsEmergency(request));

    if (auditorApproval) {
      if (!actor.roles.includes("AUDITOR")) {
        throw forbidden("Neste cenário, a aprovação cabe ao Auditor (seção 8.8.2)");
      }
    } else if (!actor.roles.includes("ADMIN_MASTER")) {
      throw forbidden("Somente outro Admin Master pode decidir esta solicitação");
    }

    if (parsed.decision === "REJECT") {
      const rejected = await this.reject(requestId, actor, parsed.reason);
      return { request: rejected, executed: false };
    }

    const executed = await this.approveAndExecute(request, actor, parsed.reason);
    return { request: executed, executed: true };
  }

  private async reject(
    requestId: string,
    actor: CriticalOperationActor,
    reason?: string,
  ): Promise<CriticalOperationRequestWithUsers> {
    const request = await this.requests.findById(requestId);
    if (!request) throw notFound("Solicitação não encontrada");

    const rejected = await withTransaction(async (tx) => {
      const claimed = await tx.criticalOperationRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: {
          status: "REJECTED",
          approvedBy: actor.id,
          decidedAt: new Date(),
          decisionReason: reason ?? null,
        },
      });
      if (claimed.count !== 1) throw conflict("Solicitação já decidida");

      const txAudit = new AuditService(new LogRepository(tx));
      await txAudit.record({
        userId: auditUserId(actor.id),
        role: actor.roles[0] ?? null,
        ipAddress: actor.ipAddress,
        action: AUDIT_ACTIONS.CRITICAL_OPERATION_REJECTED,
        module: request.module ?? "USERS",
        recordType: "CriticalOperationRequest",
        recordId: request.id,
        result: "SUCCESS",
        newValue: { operation: request.operation, reason: reason ?? null },
      });

      return tx.criticalOperationRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: { requester: true, approver: true },
      });
    });

    return rejected;
  }

  private async approveAndExecute(
    request: CriticalOperationRequestWithUsers,
    actor: CriticalOperationActor,
    reason?: string,
  ): Promise<CriticalOperationRequestWithUsers> {
    return withTransaction(async (tx) => {
      const claimed = await tx.criticalOperationRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          approvedBy: actor.id,
          decidedAt: new Date(),
          decisionReason: reason ?? null,
        },
      });
      if (claimed.count !== 1) throw conflict("Solicitação já decidida");

      const result = await this.executor.execute(tx, request, {
        id: actor.id,
        ipAddress: actor.ipAddress,
      });

      const executed = await tx.criticalOperationRequest.update({
        where: { id: request.id },
        data: { status: "EXECUTED", executedAt: new Date() },
        include: { requester: true, approver: true },
      });

      const txAudit = new AuditService(new LogRepository(tx));
      const baseEvent = {
        userId: auditUserId(actor.id),
        role: actor.roles[0] ?? null,
        ipAddress: actor.ipAddress,
        module: request.module ?? "USERS",
        recordType: "CriticalOperationRequest",
        recordId: request.id,
        result: "SUCCESS" as const,
      };

      await txAudit.record({
        ...baseEvent,
        action: AUDIT_ACTIONS.CRITICAL_OPERATION_APPROVED,
        newValue: { operation: request.operation, reason: reason ?? null },
      });
      await txAudit.record({
        ...baseEvent,
        action: AUDIT_ACTIONS.CRITICAL_OPERATION_EXECUTED,
        newValue: {
          operation: request.operation,
          summary: result.summary,
          details: result.details ?? null,
        },
      });

      return executed;
    });
  }
}

export function canRequestCriticalOperation(
  actor: CriticalOperationActor,
  operation: CriticalOperationRequestInput["operation"],
): boolean {
  return actorHas(actor, CRITICAL_OPERATION_PERMISSION[operation]);
}

export { PERMISSIONS };
