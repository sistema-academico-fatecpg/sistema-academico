import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { conflict } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { hashToken } from "@/app/lib/auth/tokens";
import { MfaRecoveryCodeRepository } from "@/app/repositories/mfa-recovery-code.repository";

const BodySchema = z.object({ code: z.string().trim().min(8).max(64) });

/**
 * 8.3.6: marca o código de recuperação como usado também na trilha da
 * aplicação. O Better Auth já consome o código no plugin; aqui garantimos que
 * a cópia hashada não possa ser reutilizada.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const { code } = BodySchema.parse(await request.json());
    const consumed = await new MfaRecoveryCodeRepository().consumeByHash(actor.id, hashToken(code));
    if (!consumed) throw conflict("Código de recuperação inválido ou já utilizado");
    const ctx = actorFrom(actor, request);
    await createAuditService().record({
      userId: actor.id as never,
      role: actor.roles[0] ?? null,
      ipAddress: ctx.ipAddress,
      action: AUDIT_ACTIONS.SECOND_FACTOR_RECOVERY_USED,
      module: "USERS",
      recordType: "User",
      recordId: actor.id,
      result: "SUCCESS",
    });
    return Response.json({ status: "CONSUMED" });
  } catch (error) {
    return jsonError(error);
  }
}
