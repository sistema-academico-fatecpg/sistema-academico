import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { AccountService } from "@/app/lib/auth/account-service";
import { requirePermission } from "@/app/lib/auth/session";
import { PERMISSIONS } from "@/app/types/roles";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const { id } = await ctx.params;
    await new AccountService().resendActivation(id, actorFrom(actor, request));
    return Response.json({ status: "SENT" });
  } catch (error) {
    return jsonError(error);
  }
}
