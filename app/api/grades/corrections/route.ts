import { GradeService } from "@/app/lib/academic/grade-service";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { CorrectGradeSchema } from "@/app/types/academic";
import { PERMISSIONS } from "@/app/types/roles";

/** 9.2.5: correção após fechamento vira solicitação de operação crítica. */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.GRADES_UPDATE);
    const input = CorrectGradeSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const result = await new GradeService().requestCorrection(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      input,
    );
    return Response.json({ status: "PENDING_APPROVAL", ...result }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
