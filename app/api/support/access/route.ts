import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { SupportAccessGrantRepository } from "@/app/repositories/support-access-grant.repository";
import { SupportAccessRequestSchema } from "@/app/types/critical-operation";

export async function GET() {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("AUDITOR") && !actor.roles.includes("SUPORTE_TECNICO")) {
      throw forbidden("Acesso restrito ao Auditor e ao Suporte Técnico");
    }
    const items = await new SupportAccessGrantRepository().list();
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const input = SupportAccessRequestSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const grant = await new SupportAccessService().request(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      input,
    );
    return Response.json({ status: "PENDING", grant }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
