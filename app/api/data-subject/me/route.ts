import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { DataSubjectService } from "@/app/lib/security/data-subject-service";

export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const ctx = actorFrom(actor, request);
    const data = await new DataSubjectService().ownData({
      id: ctx.actorId,
      roles: ctx.actorRoles,
      ipAddress: ctx.ipAddress,
    });
    return Response.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
