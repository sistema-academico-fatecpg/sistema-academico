import { jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";

export async function GET(request: Request) {
  try {
    const actor = await requireUser(request.headers);
    return Response.json({
      id: actor.id,
      name: actor.name,
      socialName: actor.user.socialName,
      email: actor.email,
      registrationNumber: actor.user.registrationNumber,
      roles: actor.roles,
      permissions: [...actor.permissions].sort(),
      status: actor.status,
      mfaEnabled: actor.mfaEnabled,
      mfaSetupRequired: actor.mfaSetupRequired,
      isEmergency: actor.isEmergency,
      lastLoginAt: actor.user.lastLoginAt?.toISOString() ?? null,
      createdAt: actor.user.createdAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
