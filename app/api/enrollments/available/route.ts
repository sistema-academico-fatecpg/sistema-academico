import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";

/** 9.1.1–9.1.3: turmas do período do aluno, DP obrigatória e conflitos. */
export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const ctx = actorFrom(actor, request);
    const items = await new EnrollmentService().available({
      id: ctx.actorId,
      roles: ctx.actorRoles,
      ipAddress: ctx.ipAddress,
    });
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
