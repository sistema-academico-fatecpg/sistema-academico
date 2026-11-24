import { jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { PERMISSIONS } from "@/app/types/roles";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.BACKUPS_READ);
    const items = await db.backupRecord.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
