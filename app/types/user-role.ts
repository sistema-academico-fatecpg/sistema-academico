import { z } from "zod";
import type { Role, UserId } from "./common";
import { RoleSchema, UserIdSchema } from "./common";

/**
 * Vinculação de usuário a perfil (tabela user_roles).
 *
 * Chave primária composta (user_id, role). Um usuário pode ter vários
 * perfis; permissões são atribuídas a perfis, nunca avulsas
 * (seção 7.1 da Política de Segurança).
 */
export type UserRoleInput = {
  userId: UserId;
  role: Role;
};

export const UserRoleInputSchema = z.object({
  user_id: UserIdSchema,
  role: RoleSchema,
});

export type UserRole = {
  userId: UserId;
  role: Role;
};

export const UserRoleSchema = z.object({
  user_id: UserIdSchema,
  role: RoleSchema,
});
