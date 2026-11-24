import { jsonError } from "@/app/lib/api/responses";
import { expireEmergencyAccounts } from "@/app/lib/auth/emergency-service";
import { getClientIp } from "@/app/lib/request-context";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/**
 * Agendador da Infraestrutura para bloqueio de contas Master emergenciais
 * expiradas (8.8.3). A verificação por requisição também ocorre em `session.ts`.
 */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const count = await expireEmergencyAccounts(getClientIp(request));
    return Response.json({ status: "EXPIRED", count });
  } catch (error) {
    return jsonError(error);
  }
}
