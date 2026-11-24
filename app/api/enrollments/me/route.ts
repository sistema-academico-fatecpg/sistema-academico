import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";

/** 9.3.1: o identificador do aluno vem da sessão, nunca da query. */
export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const ctx = actorFrom(actor, request);
    const items = await new EnrollmentService().ownHistory({
      id: ctx.actorId,
      roles: ctx.actorRoles,
      ipAddress: ctx.ipAddress,
    });
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
