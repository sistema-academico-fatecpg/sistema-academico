import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { DataSubjectService } from "@/app/lib/security/data-subject-service";
import { GuardianConsentSchema } from "@/app/types/lgpd";

/**
 * 11.1.3: registro do consentimento do responsável legal. A maioridade é
 * validada no serviço com a data de nascimento armazenada no cadastro; o
 * payload não aceita `birthDate` nem pode alterar o cadastro do aluno.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const studentId = z.string().uuid().parse(id);
    const body = GuardianConsentSchema.parse(await request.json());
    const context = actorFrom(actor, request);
    await new DataSubjectService().recordGuardianConsent(
      { id: context.actorId, roles: context.actorRoles, ipAddress: context.ipAddress },
      body.studentId ?? studentId,
      body.guardianName,
    );
    return Response.json({ status: "CONSENT_RECORDED" });
  } catch (error) {
    return jsonError(error);
  }
}
