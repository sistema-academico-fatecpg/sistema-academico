import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import { PERMISSIONS } from "@/app/types/roles";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.ROLES_APPROVE);
    const { id } = await ctx.params;
    const request = await new CriticalOperationRequestRepository().findById(
      z.string().uuid().parse(id),
    );
    if (!request) {
      return Response.json({ error: "Solicitação não encontrada" }, { status: 404 });
    }
    return Response.json(request);
  } catch (error) {
    return jsonError(error);
  }
}
