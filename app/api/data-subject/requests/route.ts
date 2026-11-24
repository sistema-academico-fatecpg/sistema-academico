import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { DataSubjectService } from "@/app/lib/security/data-subject-service";
import { DataSubjectRequestInputSchema } from "@/app/types/lgpd";

export async function GET() {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      throw forbidden("Listagem restrita ao Admin Master e ao Auditor/DPO");
    }
    const items = await db.dataSubjectRequest.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const input = DataSubjectRequestInputSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const record = await new DataSubjectService().request(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      input,
    );
    return Response.json({ status: "PENDING", request: record }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
