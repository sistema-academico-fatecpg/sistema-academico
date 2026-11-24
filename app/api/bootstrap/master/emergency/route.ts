import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { forbidden, notFound } from "@/app/lib/auth/errors";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { getClientIp } from "@/app/lib/request-context";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";
import { UserRepository } from "@/app/repositories/user.repository";
import { DateTimeSchema, InstitucionalEmailSchema } from "@/app/types/common";

const BodySchema = z.object({
  name: z.string().trim().min(3).max(150),
  email: InstitucionalEmailSchema,
  authorizationDocument: z.string().trim().min(10).max(255),
  requestedByAuditorId: z.string().uuid(),
  emergencyExpiresAt: DateTimeSchema.optional(),
});

/**
 * Contingência: nenhum Admin Master disponível (8.8). A Infraestrutura registra
 * a conta sem senha, anexa a autorização formal da direção e deixa a aprovação
 * para outro Auditor no fluxo de operações críticas.
 */
export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const body = BodySchema.parse(await request.json());

    const auditor = await new UserRepository().findById(body.requestedByAuditorId);
    if (!auditor) throw notFound("Auditor não encontrado");
    const isAuditor = auditor.roles.some((item) => item.role.name === "AUDITOR");
    if (auditor.status !== "ACTIVE" || !isAuditor) {
      throw forbidden("O solicitante nominal deve ser um Auditor ativo");
    }

    const created = await new CriticalOperationService().requestEmergencyMaster({
      name: body.name,
      email: body.email,
      authorizationDocument: body.authorizationDocument,
      requestedByAuditorId: body.requestedByAuditorId,
      emergencyExpiresAt: body.emergencyExpiresAt,
      ipAddress: getClientIp(request),
    });

    return Response.json({ status: "PENDING_APPROVAL", requestId: created.id }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
