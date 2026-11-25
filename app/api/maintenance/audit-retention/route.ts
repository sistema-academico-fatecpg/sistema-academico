import { jsonError } from "@/app/lib/api/responses";
import { recordMaintenanceIntervention } from "@/app/lib/audit/maintenance-trail";
import { auditRetentionReport } from "@/app/lib/audit/retention-service";
import { getClientIp } from "@/app/lib/request-context";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** 10.7/10.9: relatório de retenção para a Infraestrutura, sem ler conteúdo. */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const report = await auditRetentionReport();
    await recordMaintenanceIntervention("AUDIT_RETENTION_REPORT", getClientIp(request), {
      accessExpired: report.accessExpired,
    });
    return Response.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
