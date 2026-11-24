import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { forbidden, notFound } from "@/app/lib/auth/errors";
import { requirePermission } from "@/app/lib/auth/session";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { getClientIp } from "@/app/lib/request-context";
import { UserRepository } from "@/app/repositories/user.repository";
import { PERMISSIONS } from "@/app/types/roles";

const BodySchema = z.object({
  reason: z.string().trim().min(10).max(2000),
  identityVerifiedAt: z.string().datetime().optional(),
});

/**
 * Redefinição de segundo fator sem códigos de recuperação (8.6.2): exige
 * identificação presencial na secretaria e dupla aprovação de um Admin Master.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const { id } = await ctx.params;
    const userId = z.string().uuid().parse(id);
    const body = BodySchema.parse(await request.json());

    if (userId === actor.id) {
      throw forbidden("A identificação presencial deve ser registrada por outro usuário");
    }

    const target = await new UserRepository().findById(userId);
    if (!target) throw notFound("Usuário não encontrado");

    const created = await new CriticalOperationService().request(
      {
        id: actor.id,
        roles: actor.roles,
        ipAddress: getClientIp(request),
        permissions: actor.permissions,
      },
      {
        operation: "RESET_SECOND_FACTOR",
        module: "USERS",
        recordType: "User",
        recordId: userId,
        reason: body.reason,
        payload: {
          userId,
          ...(body.identityVerifiedAt ? { identityVerifiedAt: body.identityVerifiedAt } : {}),
        },
      },
    );

    return Response.json({ status: "PENDING_APPROVAL", requestId: created.id }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
