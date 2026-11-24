import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { DataSubjectService } from "@/app/lib/security/data-subject-service";
import { DataSubjectDecisionSchema } from "@/app/types/lgpd";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const { decision } = DataSubjectDecisionSchema.parse(await request.json());
    const context = actorFrom(actor, request);
    const result = await new DataSubjectService().decide(
      { id: context.actorId, roles: context.actorRoles, ipAddress: context.ipAddress },
      z.string().uuid().parse(id),
      decision,
    );
    return Response.json({ status: result.status, request: result });
  } catch (error) {
    return jsonError(error);
  }
}
