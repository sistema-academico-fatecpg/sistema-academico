import { jsonError } from "@/app/lib/api/responses";
import { recordMaintenanceIntervention } from "@/app/lib/audit/maintenance-trail";
import { getClientIp } from "@/app/lib/request-context";
import { clockDriftReport } from "@/app/lib/security/compliance-service";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** 10.1: relógio do servidor sincronizado por NTP. */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const report = await clockDriftReport();
    await recordMaintenanceIntervention("CLOCK_DRIFT_CHECK", getClientIp(request), {
      driftSeconds: report.driftSeconds,
      compliant: report.compliant,
    });
    return Response.json(report, { status: report.compliant ? 200 : 409 });
  } catch (error) {
    return jsonError(error);
  }
}
