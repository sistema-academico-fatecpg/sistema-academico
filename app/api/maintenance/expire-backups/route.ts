import { jsonError } from "@/app/lib/api/responses";
import { getClientIp } from "@/app/lib/request-context";
import { BackupService } from "@/app/lib/security/backup-service";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** 11.3.1/10.7: arquivamento após o prazo de retenção. */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const count = await new BackupService().expireRetention(new Date(), getClientIp(request));
    return Response.json({ status: "EXPIRED", count });
  } catch (error) {
    return jsonError(error);
  }
}
