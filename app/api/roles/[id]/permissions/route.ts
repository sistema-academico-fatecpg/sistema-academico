import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { notFound } from "@/app/lib/auth/errors";
import { requirePermission } from "@/app/lib/auth/session";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { getClientIp } from "@/app/lib/request-context";
import { RoleRepository } from "@/app/repositories/role.repository";
import { PERMISSIONS } from "@/app/types/roles";

const BodySchema = z.object({
  permissionNames: z.array(z.string().regex(/^[A-Z_]+:[A-Z_]+$/, "Permissão inválida")).max(100),
  reason: z.string().trim().min(10).max(2000),
});

/**
 * 7.5.4 / 7.6: concessão ou revogação de permissões administrativas nunca é
 * direta — cria solicitação pendente de dupla aprovação. A execução emite
 * PERMISSIONS_CHANGED, que dispara alerta ao Auditor (10.6).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.ROLES_UPDATE);
    const { id } = await ctx.params;
    const roleId = z.string().uuid().parse(id);
    const body = BodySchema.parse(await request.json());
    const role = await new RoleRepository().findById(roleId);
    if (!role) throw notFound("Perfil não encontrado");

    const created = await new CriticalOperationService().request(
      {
        id: actor.id,
        roles: actor.roles,
        ipAddress: getClientIp(request),
        permissions: actor.permissions,
      },
      {
        operation: "GRANT_REVOKE_ADMIN_PERMISSION",
        module: "ROLES",
        recordType: "Role",
        recordId: roleId,
        reason: body.reason,
        payload: {
          action: "SET_ROLE_PERMISSIONS",
          roleId,
          permissionNames: body.permissionNames,
        },
      },
    );
    return Response.json({ status: "PENDING_APPROVAL", requestId: created.id }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
