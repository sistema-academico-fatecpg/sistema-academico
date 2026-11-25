import { jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { BackupService } from "@/app/lib/security/backup-service";
import { PERMISSIONS } from "@/app/types/roles";

/** 11.3.5: RPO 24h / RTO 8h. */
export async function GET() {
  try {
    await requirePermission(PERMISSIONS.BACKUPS_READ);
    return Response.json(await new BackupService().status());
  } catch (error) {
    return jsonError(error);
  }
}
