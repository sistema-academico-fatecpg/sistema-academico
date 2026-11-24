import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { getClientIp } from "@/app/lib/request-context";
import { BackupService } from "@/app/lib/security/backup-service";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

const BodySchema = z.object({
  type: z.enum(["FULL", "INCREMENTAL", "SEMESTER_CLOSING"]).default("INCREMENTAL"),
});

/** Agendador da Infraestrutura para a rotina 3-2-1 (11.3). */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const { type } = BodySchema.parse(await request.json().catch(() => ({})));
    const record = await new BackupService().create(type, "maintenance-api", getClientIp(request));
    return Response.json({ status: "CREATED", backup: record }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
