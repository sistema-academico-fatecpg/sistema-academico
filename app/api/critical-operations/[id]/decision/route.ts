import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { getClientIp } from "@/app/lib/request-context";
import { ApprovalDecisionSchema } from "@/app/types/critical-operation";
import { PERMISSIONS } from "@/app/types/roles";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.ROLES_APPROVE);
    const { id } = await ctx.params;
    const decision = ApprovalDecisionSchema.parse(await request.json());

    const result = await new CriticalOperationService().decide(
      z.string().uuid().parse(id),
      decision,
      {
        id: actor.id,
        roles: actor.roles,
        ipAddress: getClientIp(request),
        permissions: actor.permissions,
      },
      request.headers.get("x-direction-authorization") ?? undefined,
    );

    return Response.json({
      status: result.request.status,
      executed: result.executed,
      request: result.request,
    });
  } catch (error) {
    return jsonError(error);
  }
}
