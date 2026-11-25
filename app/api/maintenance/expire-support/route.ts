import { jsonError } from "@/app/lib/api/responses";
import { recordMaintenanceIntervention } from "@/app/lib/audit/maintenance-trail";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { getClientIp } from "@/app/lib/request-context";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** Revogação automática das concessões expiradas (10.8.3). */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const count = await new SupportAccessService().expireDue();
    await recordMaintenanceIntervention("EXPIRE_SUPPORT_GRANTS", getClientIp(request), { count });
    return Response.json({ status: "EXPIRED", count });
  } catch (error) {
    return jsonError(error);
  }
}
