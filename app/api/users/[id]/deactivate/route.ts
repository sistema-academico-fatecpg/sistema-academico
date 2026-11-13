import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { AccountService } from "@/app/lib/auth/account-service";
import { forbidden } from "@/app/lib/auth/errors";
import { requirePermission } from "@/app/lib/auth/session";
import { PERMISSIONS } from "@/app/types/roles";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    if (actor.roles[0] !== "ADMIN_MASTER") {
      throw forbidden("Somente o Admin Master pode desligar contas");
    }
    const { id } = await ctx.params;
    if (id === actor.id) throw forbidden("Não é possível desligar a própria conta");
    await new AccountService().deactivate(id, actorFrom(actor, request));
    return Response.json({ status: "INACTIVE" });
  } catch (error) {
    return jsonError(error);
  }
}
