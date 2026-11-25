import { jsonError } from "@/app/lib/api/responses";
import { recordMaintenanceIntervention } from "@/app/lib/audit/maintenance-trail";
import { getClientIp } from "@/app/lib/request-context";
import { restoreTestReport } from "@/app/lib/security/compliance-service";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** 11.3.4/11.3.5: teste mensal de restauração e RPO/RTO. */
export async function GET(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const report = await restoreTestReport();
    await recordMaintenanceIntervention("RESTORE_STATUS_CHECK", getClientIp(request), {
      overdue: report.overdue,
    });
    return Response.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
