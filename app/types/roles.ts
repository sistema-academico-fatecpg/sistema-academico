import { z } from "zod";

/**
 * Módulos do sistema (seção 7.2 da Política de Segurança).
 * Cada permissão combina um módulo com uma ação.
 */
export const Module = z.enum([
  "USERS",
  "GRADES",
  "ENROLLMENTS",
  "LOGS",
  "ROLES_PERMISSIONS",
  "PERIODS",
  "EXPORT",
  "BACKUP",
  "CRITICAL_OPERATIONS",
]);
export type Module = z.infer<typeof Module>;

/**
 * Ações possíveis sobre um módulo (seção 7.2 da Política de Segurança).
 */
export const Action = z.enum(["READ", "CREATE", "UPDATE", "DELETE"]);
export type Action = z.infer<typeof Action>;

/**
 * Permissão: combina um módulo com uma ação.
 */
export const Permission = z.object({
  module: Module,
  action: Action,
});
export type Permission = z.infer<typeof Permission>;

/**
 * Perfis permanentes e temporários (seção 7 da Política de Segurança).
 */
export const RoleName = z.enum([
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "PROFESSOR",
  "ALUNO",
  "AUDITOR",
  "SUPORTE_TECNICO",
]);
export type RoleName = z.infer<typeof RoleName>;

/**
 * Mapeamento de perfil para suas permissões, baseado na Política de Segurança.
 *
 * Seção 7.1: permissões são atribuídas a perfis, usuários recebem perfis.
 * Seção 7.2: todo perfil novo nasce sem nenhuma permissão (aqui listamos só
 * as permissões padrão de cada perfil existente).
 */
export const RolePermissions: Record<RoleName, Permission[]> = {
  ADMIN_MASTER: [
    { module: "USERS", action: "READ" },
    { module: "USERS", action: "CREATE" },
    { module: "USERS", action: "UPDATE" },
    { module: "USERS", action: "DELETE" },
    { module: "ROLES_PERMISSIONS", action: "READ" },
    { module: "ROLES_PERMISSIONS", action: "CREATE" },
    { module: "ROLES_PERMISSIONS", action: "UPDATE" },
    { module: "ROLES_PERMISSIONS", action: "DELETE" },
    { module: "PERIODS", action: "READ" },
    { module: "PERIODS", action: "UPDATE" },
    { module: "CRITICAL_OPERATIONS", action: "READ" },
    { module: "CRITICAL_OPERATIONS", action: "UPDATE" },
  ],
  ADMIN_SECUNDARIO: [
    { module: "USERS", action: "READ" },
    { module: "USERS", action: "CREATE" },
    { module: "USERS", action: "UPDATE" },
    { module: "ENROLLMENTS", action: "READ" },
    { module: "ENROLLMENTS", action: "CREATE" },
    { module: "ENROLLMENTS", action: "UPDATE" },
  ],
  PROFESSOR: [
    { module: "GRADES", action: "READ" },
    { module: "GRADES", action: "UPDATE" },
  ],
  ALUNO: [
    { module: "ENROLLMENTS", action: "READ" },
    { module: "ENROLLMENTS", action: "CREATE" },
    { module: "GRADES", action: "READ" },
  ],
  AUDITOR: [
    { module: "LOGS", action: "READ" },
    { module: "CRITICAL_OPERATIONS", action: "READ" },
  ],
  SUPORTE_TECNICO: [{ module: "LOGS", action: "READ" }],
};

/**
 * Validador de permissão.
 */
export const PermissionSchema = z.array(Permission);

/**
 * Validador de nome de role.
 */
export const RoleSchema = RoleName;
export type RoleType = z.infer<typeof RoleSchema>;
