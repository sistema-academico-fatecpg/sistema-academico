import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { IncidentService } from "@/app/lib/security/incident-service";
import { ReportIncidentSchema } from "@/app/types/incident";

export async function GET() {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      return Response.json({ error: "Acesso restrito" }, { status: 403 });
    }
    const items = await db.incident.findMany({ orderBy: { reportedAt: "desc" } });
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const input = ReportIncidentSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const incident = await new IncidentService().report(
      {
        id: ctx.actorId,
        roles: ctx.actorRoles,
        ipAddress: ctx.ipAddress,
        permissions: actor.permissions,
      },
      input,
    );
    return Response.json({ status: "REPORTED", incident }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
