import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { DataSubjectService } from "@/app/lib/security/data-subject-service";
import { GuardianConsentSchema } from "@/app/types/lgpd";

/** 11.1.3: registro do consentimento do responsável legal. */
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
      body.birthDate,
    );
    return Response.json({ status: "CONSENT_RECORDED" });
  } catch (error) {
    return jsonError(error);
  }
}
