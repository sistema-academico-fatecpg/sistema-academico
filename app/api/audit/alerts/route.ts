import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { auditReader } from "@/app/lib/audit/reader";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { requireAuditReader } from "@/app/lib/auth/session";
import { AlertFilterSchema } from "@/app/types/log";

export async function GET(request: Request) {
  try {
    const actor = await requireAuditReader();
    const filter = AlertFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const ctx = actorFrom(actor, request);
    await new SupportAccessService().assertCanRead(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      ["AUDIT_LOGS"],
    );
    const result = await auditReader().listAlerts(filter);
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
