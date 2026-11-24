import { forbidden } from "@/app/lib/auth/errors";
import {
  type AuthenticatedUser,
  actorHasPermission,
  requirePermission,
  requireUser,
} from "@/app/lib/auth/session";
import type { Permission } from "@/app/types/roles";

export { requireUser };

export async function authorize(permission: Permission): Promise<AuthenticatedUser> {
  return requirePermission(permission);
}

export function assertPermission(actor: AuthenticatedUser, permission: Permission): void {
  if (!actorHasPermission(actor, permission)) throw forbidden("Acesso não autorizado.");
}

export function assertOwnRecord(actor: AuthenticatedUser, ownerId: string): void {
  if (
    actor.id !== ownerId &&
    !actor.roles.some((role) => role === "ADMIN_MASTER" || role === "ADMIN_SECUNDARIO")
  ) {
    throw forbidden("Acesso não autorizado.");
  }
}
