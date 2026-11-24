import { closeExpiredGradePeriods } from "@/app/lib/academic/grade-closing-service";
import { jsonError } from "@/app/lib/api/responses";
import { getClientIp } from "@/app/lib/request-context";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** Agendador da Infraestrutura para o fechamento automático de notas (9.2). */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const count = await closeExpiredGradePeriods(getClientIp(request));
    return Response.json({ status: "CLOSED", count });
  } catch (error) {
    return jsonError(error);
  }
}
