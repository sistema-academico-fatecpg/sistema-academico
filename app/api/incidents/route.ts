import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { addBusinessDays } from "@/app/lib/security/business-days";
import { IncidentService } from "@/app/lib/security/incident-service";
import { ReportIncidentSchema } from "@/app/types/incident";

export async function GET() {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      return Response.json({ error: "Acesso restrito" }, { status: 403 });
    }
    const incidents = await db.incident.findMany({ orderBy: { reportedAt: "desc" } });
    const items = incidents.map((incident) => ({
      ...incident,
      dpoDeadline: addBusinessDays(incident.reportedAt, 3).toISOString(),
    }));
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
