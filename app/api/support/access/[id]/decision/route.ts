import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { SupportAccessDecisionSchema } from "@/app/types/critical-operation";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("AUDITOR")) {
      throw forbidden("Somente o Auditor aprova acesso excepcional aos logs");
    }
    const { id } = await ctx.params;
    const decision = SupportAccessDecisionSchema.parse(await request.json());
    const context = actorFrom(actor, request);
    const result = await new SupportAccessService().decide(
      z.string().uuid().parse(id),
      decision.decision,
      { id: context.actorId, roles: context.actorRoles, ipAddress: context.ipAddress },
      request.headers.get("x-direction-authorization") ?? undefined,
    );
    return Response.json({ status: result.status, grant: result });
  } catch (error) {
    return jsonError(error);
  }
}
