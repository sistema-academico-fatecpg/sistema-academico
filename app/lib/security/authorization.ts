import { requirePermission, requireUser, type AuthenticatedUser } from "@/app/lib/auth/session";
import type { Permission } from "@/app/types/roles";
import { hasPermission } from "@/app/types/roles";
import { forbidden } from "@/app/lib/auth/errors";

export { requireUser };

export async function authorize(permission: Permission): Promise<AuthenticatedUser> {
  return requirePermission(permission);
}

export function assertPermission(actor: AuthenticatedUser, permission: Permission): void {
  if (!hasPermission(actor.roles, permission)) throw forbidden("Acesso não autorizado.");
}

export function assertOwnRecord(actor: AuthenticatedUser, ownerId: string): void {
  if (actor.id !== ownerId && !actor.roles.some(role => role === "ADMIN_MASTER" || role === "ADMIN_SECUNDARIO")) {
    throw forbidden("Acesso não autorizado.");
  }
}
