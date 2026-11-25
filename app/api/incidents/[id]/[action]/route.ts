import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { IncidentService } from "@/app/lib/security/incident-service";
import {
  AnalyzeIncidentSchema,
  ContainIncidentSchema,
  NotifyIncidentSchema,
  RequestRestoreSchema,
} from "@/app/types/incident";

const ActionSchema = z.enum(["contain", "analyze", "restore", "notify", "close"]);

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; action: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, action: rawAction } = await ctx.params;
    const action = ActionSchema.parse(rawAction);
    const incidentId = z.string().uuid().parse(id);
    const context = actorFrom(actor, request);
    const incidentActor = {
      id: context.actorId,
      roles: context.actorRoles,
      ipAddress: context.ipAddress,
      permissions: actor.permissions,
    };
    const service = new IncidentService();
    const body = await request.json().catch(() => ({}));

    if (action === "contain") {
      const result = await service.contain(
        incidentActor,
        incidentId,
        ContainIncidentSchema.parse(body),
      );
      return Response.json({ status: result.status, incident: result });
    }
    if (action === "analyze") {
      const result = await service.analyze(
        incidentActor,
        incidentId,
        AnalyzeIncidentSchema.parse(body),
      );
      return Response.json({ status: result.status, incident: result });
    }
    if (action === "restore") {
      const result = await service.requestRestore(
        incidentActor,
        incidentId,
        RequestRestoreSchema.parse(body),
      );
      return Response.json({ status: "RESTORE_REQUESTED", ...result }, { status: 202 });
    }
    if (action === "notify") {
      const result = await service.notify(
        incidentActor,
        incidentId,
        NotifyIncidentSchema.parse(body),
      );
      return Response.json({ status: "NOTIFIED", ...result });
    }
    const result = await service.close(incidentActor, incidentId);
    return Response.json({ status: result.status, incident: result });
  } catch (error) {
    return jsonError(error);
  }
}
