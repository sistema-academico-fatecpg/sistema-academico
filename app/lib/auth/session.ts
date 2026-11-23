import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { UserRepository, type UserWithRoles } from "@/app/repositories/user.repository";
import type { RoleName } from "@/app/types/common";
import { hasPermission, type Permission, sessionInactivitySeconds } from "@/app/types/roles";
import { auth } from "./better-auth";
import { forbidden, unauthenticated } from "./errors";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  status: UserWithRoles["status"];
  roles: RoleName[];
  sessionId: string;
  sessionUpdatedAt: Date;
  user: UserWithRoles;
};

function rolesOf(user: UserWithRoles): RoleName[] {
  return user.roles.map((userRole) => userRole.role.name);
}

/**
 * Carrega a sessão do Better Auth e revalida o estado da conta no banco em
 * cada requisição (seção 9: autorização server-side a cada acesso).
 */
export async function getAuthenticatedUser(
  requestHeaders?: Headers,
): Promise<AuthenticatedUser | null> {
  const resolvedHeaders = requestHeaders ?? (await headers());
  const session = await auth.api.getSession({ headers: resolvedHeaders });
  if (!session?.session || !session.user) return null;

  const user = await new UserRepository().findById(session.user.id);
  if (!user) return null;

  if (user.status !== "ACTIVE") {
    await db.session.deleteMany({ where: { id: session.session.id } });
    return null;
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await db.session.deleteMany({ where: { id: session.session.id } });
    return null;
  }

  const roles = rolesOf(user);
  const idleSeconds = Math.floor((Date.now() - session.session.updatedAt.getTime()) / 1000);
  if (idleSeconds > sessionInactivitySeconds(roles)) {
    await db.session.deleteMany({ where: { id: session.session.id } });
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    roles,
    sessionId: session.session.id,
    sessionUpdatedAt: session.session.updatedAt,
    user,
  };
}

export async function requireUser(requestHeaders?: Headers): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(requestHeaders);
  if (!user) throw unauthenticated();
  return user;
}

export async function requirePermission(
  permission: Permission,
  requestHeaders?: Headers,
): Promise<AuthenticatedUser> {
  const user = await requireUser(requestHeaders);
  if (!hasPermission(user.roles, permission)) {
    throw forbidden(`Permissão ${permission} necessária`);
  }
  return user;
}
