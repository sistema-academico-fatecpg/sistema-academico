import { jsonError } from "@/app/lib/api/responses";
import { getClientIp } from "@/app/lib/request-context";
import { keyRotationReport } from "@/app/lib/security/compliance-service";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";

/** 11.2.4: rotação anual e custodiantes do cofre. */
export async function GET(request: Request) {
  try {
    assertMaintenanceSecret(request);
    return Response.json(await keyRotationReport(new Date(), getClientIp(request)));
  } catch (error) {
    return jsonError(error);
  }
}
