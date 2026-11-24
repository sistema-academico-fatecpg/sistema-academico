import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { BackupService } from "@/app/lib/security/backup-service";
import { PERMISSIONS } from "@/app/types/roles";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.BACKUPS_READ);
    const { id } = await ctx.params;
    const record = await new BackupService().verify(z.string().uuid().parse(id));
    return Response.json({ status: record.status, backup: record });
  } catch (error) {
    return jsonError(error);
  }
}
