import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { UserRepository, type UserWithRoles } from "@/app/repositories/user.repository";
import type { RoleName } from "@/app/types/common";
import {
  hasPermission,
  PERMISSIONS,
  type Permission,
  ROLE_PERMISSIONS,
  requiresMfa,
  sessionInactivitySeconds,
} from "@/app/types/roles";
import { auth } from "./better-auth";
import { AuthError, forbidden, unauthenticated } from "./errors";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  status: UserWithRoles["status"];
  roles: RoleName[];
  /** Permissões efetivas carregadas do banco (fallback: matriz estática). */
  permissions: ReadonlySet<Permission>;
  mfaEnabled: boolean;
  mfaSetupRequired: boolean;
  isEmergency: boolean;
  sessionId: string;
  sessionUpdatedAt: Date;
  user: UserWithRoles;
};

function rolesOf(user: UserWithRoles): RoleName[] {
  return user.roles.map((userRole) => userRole.role.name as RoleName);
}

/**
 * As permissões são atribuídas a perfis (seção 7.1). O banco é a fonte
 * autoritativa quando a matriz foi sincronizada pelo seed; a matriz estática
 * serve apenas para instalações ainda não semeadas.
 */
function permissionsOf(user: UserWithRoles): ReadonlySet<Permission> {
  const fromDatabase = new Set<Permission>();
  let seeded = false;

  for (const userRole of user.roles) {
    const permissions = userRole.role.permissions;
    if (permissions.length > 0) seeded = true;
    for (const item of permissions) {
      fromDatabase.add(`${item.permission.module}:${item.permission.action}` as Permission);
    }
  }

  if (seeded) return fromDatabase;

  return new Set(rolesOf(user).flatMap((role) => ROLE_PERMISSIONS[role] ?? []));
}

async function revokeSession(sessionId: string): Promise<void> {
  await db.session.deleteMany({ where: { id: sessionId } });
}

/**
 * Carrega a sessão do Better Auth e revalida o estado da conta no banco em
 * cada requisição (seções 7.3 e 9: autorização server-side a cada acesso).
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
    await revokeSession(session.session.id);
    return null;
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await revokeSession(session.session.id);
    return null;
  }

  // Conta Master emergencial expira automaticamente (seção 8.8.3).
  if (user.isEmergency && user.emergencyExpiresAt && user.emergencyExpiresAt <= new Date()) {
    await db.user.update({
      where: { id: user.id },
      data: {
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedBy: "system:emergency-expiry",
        blockReason: "Conta Master emergencial expirada",
      },
    });
    await revokeSession(session.session.id);
    return null;
  }

  const roles = rolesOf(user);
  const idleSeconds = Math.floor((Date.now() - session.session.updatedAt.getTime()) / 1000);
  if (idleSeconds > sessionInactivitySeconds(roles)) {
    await revokeSession(session.session.id);
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    roles,
    permissions: permissionsOf(user),
    mfaEnabled: user.twoFactorEnabled,
    mfaSetupRequired: requiresMfa(roles) && !user.twoFactorEnabled,
    isEmergency: user.isEmergency,
    sessionId: session.session.id,
    sessionUpdatedAt: session.session.updatedAt,
    user,
  };
}

export async function requireUser(requestHeaders?: Headers): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(requestHeaders);
  if (!user) throw unauthenticated();
  // A matriz de perfis com MFA obrigatório vale para toda autenticação
  // server-side, inclusive rotas que só chamam requireUser (8.4.2).
  assertMfaConfigured(user);
  return user;
}

export function actorHasPermission(actor: AuthenticatedUser, permission: Permission): boolean {
  return actor.permissions.has(permission) || hasPermission(actor.roles, permission);
}

function assertMfaConfigured(actor: AuthenticatedUser): void {
  if (!actor.mfaSetupRequired) return;
  throw new AuthError(
    "Configure o segundo fator para acessar os dados do sistema.",
    "FORBIDDEN",
    403,
    { code: "MFA_REQUIRED", setupUrl: "/configurar-2fa" },
  );
}

export async function requirePermission(
  permission: Permission,
  requestHeaders?: Headers,
): Promise<AuthenticatedUser> {
  const user = await requireUser(requestHeaders);
  assertMfaConfigured(user);
  if (!actorHasPermission(user, permission)) {
    throw forbidden(`Permissão ${permission} necessária`);
  }
  return user;
}

/**
 * Acesso somente leitura ao log pelo perfil Auditor ou por Suporte Técnico com
 * concessão temporária válida (seções 10.4 e 10.8). Implementado no serviço de
 * auditoria; aqui garantimos apenas que o perfil não seja administrativo.
 */
export async function requireAuditReader(requestHeaders?: Headers): Promise<AuthenticatedUser> {
  const user = await requireUser(requestHeaders);
  assertMfaConfigured(user);
  if (!user.roles.includes("AUDITOR") && !user.roles.includes("SUPORTE_TECNICO")) {
    throw forbidden("Consulta de logs restrita ao Auditor");
  }
  return user;
}

export function requireMaster(actor: AuthenticatedUser): void {
  if (!actor.roles.includes("ADMIN_MASTER")) {
    throw forbidden("Operação exclusiva do Admin Master");
  }
}

export function isSelf(actor: AuthenticatedUser, userId: string): boolean {
  return actor.id === userId;
}

export { PERMISSIONS };
