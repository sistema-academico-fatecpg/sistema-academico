import { jsonError } from "@/app/lib/api/responses";
import { auditRetentionReport } from "@/app/lib/audit/retention-service";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** 10.7/10.9: relatório de retenção para a Infraestrutura, sem ler conteúdo. */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    return Response.json(await auditRetentionReport());
  } catch (error) {
    return jsonError(error);
  }
}
