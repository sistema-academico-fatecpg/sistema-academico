import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { SensitiveDataService } from "@/app/lib/security/sensitive-data-service";

const BodySchema = z.object({
  userId: z.string().uuid(),
  type: z.string().trim().min(2).max(80),
  value: z.string().trim().min(1).max(5000),
});

export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const ctx = actorFrom(actor, request);
    const items = await new SensitiveDataService().maskedForUser(ctx.actorId);
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("ADMIN_SECUNDARIO")) {
      throw forbidden("Registro de dado sensível restrito à secretaria/coordenação");
    }
    const body = BodySchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const record = await new SensitiveDataService().store(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      body.userId,
      body.type,
      body.value,
    );
    return Response.json({ status: "STORED", id: record.id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
