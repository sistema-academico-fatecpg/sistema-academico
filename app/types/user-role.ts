import { z } from "zod";
import type { RoleName, UserId, UserRoleId } from "./common";
import { RoleNameSchema, UserIdSchema, UserRoleIdSchema } from "./common";

/**
 * Vinculação de usuário a perfil (tabela user_roles).
 *
 * Chave primária composta (user_id, role). Um usuário pode ter vários
 * perfis; permissões são atribuídas a perfis, nunca avulsas (seção 7.1
 * da Política de Segurança).
 */
export type UserRoleInput = {
  userId: UserId;
  role: RoleName;
};

export const UserRoleInputSchema = z.object({
  user_id: UserIdSchema,
  role: RoleNameSchema,
});

export type UserRole = {
  id: UserRoleId;
  userId: UserId;
  role: RoleName;
};

export const UserRoleSchema = z.object({
  id: UserRoleIdSchema,
  user_id: UserIdSchema,
  role: RoleNameSchema,
});
