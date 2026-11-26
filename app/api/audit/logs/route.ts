import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { auditReader } from "@/app/lib/audit/reader";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { requireAuditReader } from "@/app/lib/auth/session";
import { LogFilterSchema } from "@/app/types/log";

/** 10.4: tela/API de logs com filtros, restrita ao Auditor (e suporte concedido). */
export async function GET(request: Request) {
  try {
    const actor = await requireAuditReader();
    const filter = LogFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const ctx = actorFrom(actor, request);
    await new SupportAccessService().assertCanRead(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      "AUDIT_LOGS",
    );
    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: ctx.ipAddress }),
      action: AUDIT_ACTIONS.AUDIT_LOG_VIEWED,
      module: "AUDIT_LOGS",
      recordType: "Log",
      result: "SUCCESS",
      newValue: { filter },
    });

    const result = await auditReader().findMany(filter);
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
