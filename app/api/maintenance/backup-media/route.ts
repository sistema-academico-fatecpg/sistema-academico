import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { db } from "@/app/lib/db";
import { getClientIp } from "@/app/lib/request-context";
import { backupMediaReport } from "@/app/lib/security/compliance-service";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

const RegisterSchema = z.object({
  label: z.string().trim().min(3).max(120),
  lockerLocation: z.string().trim().min(3).max(200),
  installedAt: z.string().datetime(),
  disconnectedAt: z.string().datetime().optional(),
  lastInspectionAt: z.string().datetime().optional(),
});

/** 11.3.2: mídia física trancada, desconectada e substituída a cada 3 anos. */
export async function GET(request: Request) {
  try {
    assertMaintenanceSecret(request);
    return Response.json(await backupMediaReport(new Date(), getClientIp(request)));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const body = RegisterSchema.parse(await request.json());
    const media = await db.backupMedia.create({
      data: {
        label: body.label,
        lockerLocation: body.lockerLocation,
        installedAt: new Date(body.installedAt),
        disconnectedAt: body.disconnectedAt ? new Date(body.disconnectedAt) : null,
        lastInspectionAt: body.lastInspectionAt ? new Date(body.lastInspectionAt) : null,
      },
    });
    return Response.json(media, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
