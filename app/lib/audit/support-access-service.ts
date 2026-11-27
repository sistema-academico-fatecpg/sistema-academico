import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { conflict, forbidden, notFound, validationError } from "@/app/lib/auth/errors";
import { SupportAccessGrantRepository } from "@/app/repositories/support-access-grant.repository";
import type { SystemModule } from "@/app/types/common";
import type { SupportAccessRequestInput } from "@/app/types/critical-operation";

export const SUPPORT_ACCESS_MAX_HOURS = 8;

export type SupportActor = {
  id: string;
  roles: readonly string[];
  ipAddress: string;
};

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 3_600_000;
}

/**
 * Acesso excepcional aos logs (10.8): sem permissão permanente, no máximo 8h,
 * aprovado pelo Auditor, com escopo por módulo e revogação automática.
 */
export class SupportAccessService {
  constructor(
    private readonly grants = new SupportAccessGrantRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async request(actor: SupportActor, input: SupportAccessRequestInput) {
    if (!actor.roles.includes("SUPORTE_TECNICO") && !actor.roles.includes("ADMIN_MASTER")) {
      throw forbidden("Solicitação restrita ao Suporte Técnico ou Admin Master");
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) {
      throw validationError("O término deve ser posterior ao início do acesso");
    }
    if (hoursBetween(startsAt, endsAt) > SUPPORT_ACCESS_MAX_HOURS) {
      throw validationError("Acesso excepcional limitado a 8 horas (10.8.2)");
    }
    if (input.involvesAuditor && !input.authorizationDocument) {
      throw validationError(
        "Investigação do próprio Auditor exige autorização formal da direção (10.8.4)",
      );
    }

    const grant = await this.grants.create({
      requestedBy: actor.id,
      reason: input.reason,
      startsAt,
      endsAt,
      modules: input.modules,
      involvesAuditor: input.involvesAuditor,
      authorizationDocument: input.authorizationDocument ?? null,
    });

    await this.audit.record({
      ...auditActor(actor),
      action: AUDIT_ACTIONS.SUPPORT_ACCESS_REQUESTED,
      module: "AUDIT_LOGS",
      recordType: "SupportAccessGrant",
      recordId: grant.id,
      result: "SUCCESS",
      newValue: {
        modules: input.modules,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        involvesAuditor: input.involvesAuditor,
      },
    });

    return grant;
  }

  async decide(
    id: string,
    decision: "APPROVE" | "REJECT",
    actor: SupportActor,
    directionAuthorization?: string,
  ) {
    const grant = await this.grants.findById(id);
    if (!grant) throw notFound("Solicitação não encontrada");
    if (grant.status !== "PENDING") throw conflict("Solicitação já decidida");
    if (grant.requestedBy === actor.id) {
      throw forbidden("O solicitante não pode aprovar o próprio acesso");
    }

    // 10.8.4: se a investigação envolve o próprio Auditor, a decisão cabe à
    // direção (representada no sistema pelo Admin Master) com autorização
    // formal; o Auditor não pode decidir sobre a própria investigação.
    if (grant.involvesAuditor) {
      if (
        !actor.roles.includes("ADMIN_MASTER") ||
        !directionAuthorization ||
        directionAuthorization !== grant.authorizationDocument
      ) {
        throw forbidden("Investigação do Auditor exige a autorização formal da direção (10.8.4)");
      }
    } else if (!actor.roles.includes("AUDITOR")) {
      throw forbidden("Somente o Auditor aprova acesso excepcional aos logs");
    }

    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = await this.grants.decide(id, status, actor.id);
    await this.audit.record({
      userId: actor.id as never,
      role: (actor.roles[0] ?? null) as never,
      ipAddress: actor.ipAddress,
      action:
        decision === "APPROVE"
          ? AUDIT_ACTIONS.SUPPORT_ACCESS_APPROVED
          : AUDIT_ACTIONS.SUPPORT_ACCESS_REJECTED,
      module: "AUDIT_LOGS",
      recordType: "SupportAccessGrant",
      recordId: id,
      result: "SUCCESS",
      newValue: { status, modules: grant.modules.map((item) => item.module) },
    });
    return updated;
  }

  /**
   * 10.8.2/10.8.3: escopo, prazo e registro de cada consulta. Todos os módulos
   * efetivamente solicitados (filtro `?module=`) devem constar da concessão;
   * o Auditor, por sua vez, tem acesso pleno aos logs.
   */
  async assertCanRead(
    actor: SupportActor,
    modules: SystemModule | readonly SystemModule[],
  ): Promise<void> {
    const requested: readonly SystemModule[] = Array.isArray(modules) ? modules : [modules];
    if (actor.roles.includes("AUDITOR")) return;
    if (!actor.roles.includes("SUPORTE_TECNICO")) {
      throw forbidden("Consulta de logs restrita ao Auditor ou Suporte Técnico autorizado");
    }

    await this.grants.expireDue();
    const active = await this.grants.findActiveForUser(actor.id);
    if (!active) {
      throw forbidden("Acesso temporário ausente, expirado ou fora do escopo aprovado");
    }
    const allowed = new Set(
      active.modules.filter((item) => item.canRead).map((item) => item.module as SystemModule),
    );
    if (requested.length === 0 || requested.some((module) => !allowed.has(module))) {
      throw forbidden("Acesso temporário ausente, expirado ou fora do escopo aprovado");
    }

    await this.audit.record({
      userId: actor.id as never,
      role: "SUPORTE_TECNICO",
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.SUPPORT_ACCESS_CONSULTED,
      module: requested[0],
      recordType: "Log",
      result: "SUCCESS",
      newValue: { grantId: active.id, modules: [...requested] },
    });
  }

  async expireDue(now = new Date()): Promise<number> {
    const result = await this.grants.expireDue(now);
    return result.count;
  }
}
