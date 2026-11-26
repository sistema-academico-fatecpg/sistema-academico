import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { requireUser } from "@/app/lib/auth/session";
import { hashToken } from "@/app/lib/auth/tokens";
import { db } from "@/app/lib/db";
import { getClientIp } from "@/app/lib/request-context";
import { MfaRecoveryCodeRepository } from "@/app/repositories/mfa-recovery-code.repository";
import { UserRepository } from "@/app/repositories/user.repository";

const BodySchema = z.object({
  backupCodes: z.array(z.string().trim().min(8).max(64)).length(10),
});

/**
 * Registra os dez códigos de recuperação exibidos uma única vez ao configurar
 * o segundo fator (8.3.6). Os códigos em si nunca são gravados em log.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const { backupCodes } = BodySchema.parse(await request.json());

    const activeTwoFactor = await db.twoFactor.count({
      where: { userId: actor.id, verified: true },
    });
    if (activeTwoFactor === 0) {
      return Response.json(
        { error: "Conclua a configuração do autenticador antes de registrar os códigos" },
        { status: 409 },
      );
    }

    const repository = new MfaRecoveryCodeRepository();
    await repository.deleteAllForUser(actor.id);
    await repository.createMany(
      actor.id,
      backupCodes.map((code) => hashToken(code)),
    );
    await new UserRepository().update(actor.id, { twoFactorEnabled: true });

    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: getClientIp(request) }),
      action: AUDIT_ACTIONS.SECOND_FACTOR_CONFIGURED,
      module: "USERS",
      recordType: "User",
      recordId: actor.id,
      result: "SUCCESS",
      newValue: { recoveryCodes: 10 },
    });

    return Response.json({ status: "CONFIGURED", recoveryCodes: 10 });
  } catch (error) {
    return jsonError(error);
  }
}
