import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";

const BodySchema = z.object({ userId: z.string().uuid() });

/**
 * 8.8 (contingência): ao final, o Auditor revisa todas as ações da conta
 * Master emergencial e registra o relatório para a direção.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("AUDITOR")) {
      throw forbidden("Revisão das ações emergenciais cabe ao Auditor");
    }
    const { userId } = BodySchema.parse(await request.json());
    const account = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, isEmergency: true, emergencyExpiresAt: true, name: true },
    });
    if (!account?.isEmergency) {
      return Response.json({ error: "Conta Master emergencial não encontrada" }, { status: 404 });
    }

    const actions = await db.log.findMany({
      where: { userId, isEmergency: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        module: true,
        recordId: true,
        result: true,
        createdAt: true,
      },
    });
    const ctx = actorFrom(actor, request);
    await createAuditService().record({
      userId: actor.id as never,
      role: "AUDITOR",
      ipAddress: ctx.ipAddress,
      action: AUDIT_ACTIONS.EMERGENCY_MASTER_REVIEWED,
      module: "USERS",
      recordType: "User",
      recordId: userId,
      result: "SUCCESS",
      newValue: { reviewedActions: actions.length, account: account.name },
    });

    return Response.json({
      status: "REVIEWED",
      account: { id: account.id, name: account.name, expiresAt: account.emergencyExpiresAt },
      totalActions: actions.length,
      actions,
    });
  } catch (error) {
    return jsonError(error);
  }
}
