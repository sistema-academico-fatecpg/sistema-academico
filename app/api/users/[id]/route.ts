import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { UserRepository } from "@/app/repositories/user.repository";
import { PERMISSIONS } from "@/app/types/roles";

const UpdateUserSchema = z.object({
  name: z.string().trim().min(3).max(150).optional(),
  socialName: z.string().trim().max(150).nullable().optional(),
  personalEmail: z.string().trim().email().nullable().optional(),
  registrationNumber: z.string().trim().max(30).nullable().optional(),
});

function toDto(user: NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>) {
  return {
    id: user.id,
    name: user.name,
    socialName: user.socialName,
    email: user.email,
    personalEmail: user.personalEmail,
    registrationNumber: user.registrationNumber,
    roles: user.roles.map((item) => item.role.name),
    status: user.status,
    mfaEnabled: user.twoFactorEnabled,
    isEmergency: user.isEmergency,
    emergencyExpiresAt: user.emergencyExpiresAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.USERS_READ);
    const { id } = await ctx.params;
    const user = await new UserRepository().findById(z.string().uuid().parse(id));
    if (!user) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
    return Response.json(toDto(user));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const { id } = await ctx.params;
    const userId = z.string().uuid().parse(id);
    const input = UpdateUserSchema.parse(await request.json());
    const repository = new UserRepository();
    const existing = await repository.findById(userId);
    if (!existing) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });

    // Perfil nunca é alterado por este endpoint: atribuições de perfil
    // administrativo dependem de dupla aprovação (seções 7.5.4 e 8.2.3).
    const updated = await repository.update(userId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.socialName !== undefined ? { socialName: input.socialName } : {}),
      ...(input.personalEmail !== undefined ? { personalEmail: input.personalEmail } : {}),
      ...(input.registrationNumber !== undefined
        ? { registrationNumber: input.registrationNumber }
        : {}),
    });

    await createAuditService().record({
      userId: actor.id as never,
      role: actor.roles[0] ?? null,
      ipAddress: getClientIp(request),
      action: AUDIT_ACTIONS.ACCOUNT_UPDATED,
      module: "USERS",
      recordType: "User",
      recordId: userId,
      oldValue: {
        name: existing.name,
        socialName: existing.socialName,
        personalEmail: existing.personalEmail,
        registrationNumber: existing.registrationNumber,
      },
      newValue: input,
      result: "SUCCESS",
    });

    return Response.json(toDto(updated));
  } catch (error) {
    return jsonError(error);
  }
}
