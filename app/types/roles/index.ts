import { z } from "zod";
import type { Permission } from "./permissions";

/**
 * Perfis permanentes e temporários do sistema.
 */
export const Role = z.enum([
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "PROFESSOR",
  "ALUNO",
  "AUDITOR",
  "SUPORTE_TECNICO",
]);

export type Role = z.infer<typeof Role>;

/**
 * Permissões atribuídas a cada perfil.
 *
 * Baseada na Política de Segurança da Informação,
 * seções 7 a 9.
 */
export const ROLE_PERMISSIONS = {
  ADMIN_MASTER: [
    "USERS:READ",
    "USERS:SAVE",
    "USERS:REMOVE",
    "PERIODS:READ",
    "PERIODS:SAVE",
    "CRITICAL_OPERATIONS:READ",
    "CRITICAL_OPERATIONS:SAVE",
  ],

  ADMIN_SECUNDARIO: ["USERS:READ", "USERS:SAVE", "ENROLLMENTS:READ", "ENROLLMENTS:SAVE"],

  PROFESSOR: ["GRADES:READ", "GRADES:SAVE"],

  ALUNO: ["GRADES:READ", "ENROLLMENTS:READ"],

  AUDITOR: ["LOGS:READ", "CRITICAL_OPERATIONS:READ"],

  SUPORTE_TECNICO: ["LOGS:READ"],
} as const satisfies Record<Role, readonly Permission[]>;

/**
 * Índice de permissões por perfil.
 *
 * Permite consultas utilizando Set.has().
 */
const rolePermissionSets = new Map<Role, Set<Permission>>(
  Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => [
    role as Role,
    new Set<Permission>(permissions),
  ]),
);

/**
 * Verifica se um perfil possui determinada permissão.
 */
export function hasRolePermission(role: Role, permission: Permission): boolean {
  return rolePermissionSets.get(role)?.has(permission) ?? false;
}

/**
 * Verifica se pelo menos um dos perfis do usuário
 * possui determinada permissão.
 */
export function hasPermission(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => hasRolePermission(role, permission));
}

/**
 * Retorna todas as permissões de um perfil.
 */
export function getRolePermissions(role: Role): Set<Permission> | undefined {
  return rolePermissionSets.get(role);
}

/**
 * Retorna todas as permissões concedidas aos perfis
 * de um usuário, sem duplicações.
 */
export function getPermissions(roles: readonly Role[]): Permission[] {
  const permissions = new Set<Permission>();

  for (const role of roles) {
    getRolePermissions(role)?.forEach((p) => {
      permissions.add(p);
    });
  }

  return [...permissions];
}
