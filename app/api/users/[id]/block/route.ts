import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { AccountService } from "@/app/lib/auth/account-service";
import { requirePermission } from "@/app/lib/auth/session";
import { PERMISSIONS } from "@/app/types/roles";
import { BlockUserSchema } from "@/app/types/user";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const { id } = await ctx.params;
    const { reason } = BlockUserSchema.parse(await request.json());
    await new AccountService().block(id, reason, actorFrom(actor, request));
    return Response.json({ status: "BLOCKED" });
  } catch (error) {
    return jsonError(error);
  }
}
