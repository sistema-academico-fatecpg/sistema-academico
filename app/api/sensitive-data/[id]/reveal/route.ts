import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { SensitiveDataService } from "@/app/lib/security/sensitive-data-service";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const context = actorFrom(actor, request);
    const value = await new SensitiveDataService().reveal(
      { id: context.actorId, roles: context.actorRoles, ipAddress: context.ipAddress },
      z.string().uuid().parse(id),
    );
    return Response.json({ value });
  } catch (error) {
    return jsonError(error);
  }
}
