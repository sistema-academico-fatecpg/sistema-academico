import { z } from "zod";
import type { AccountStatus, DateTime, Email, InstitucionalEmail, Role, UserId } from "./common";
import {
  AccountStatusSchema,
  DateTimeSchema,
  EmailSchema,
  InstitucionalEmailSchema,
  RoleSchema,
  UserIdSchema,
} from "./common";

/**
 * Usuário do sistema (tabela users).
 *
 * A senha é gerenciada pelo Better Auth (argon2id). O status inicial
 * é PENDING_ACTIVATION (seção 8.1 da Política de Segurança).
 */
export type UserInput = {
  name: string;
  socialName: string | null;
  email: Email;
  institutionalEmail: InstitucionalEmail;
  registrationNumber: string | null;
  role: Role;
};

export const UserInputSchema = z.object({
  name: z.string().min(1),
  social_name: z.string().nullable(),
  email: EmailSchema,
  institutional_email: InstitucionalEmailSchema,
  registration_number: z.string().nullable(),
  role: RoleSchema,
});

export type UserDto = {
  id: UserId;
  name: string;
  socialName: string | null;
  email: Email;
  institutionalEmail: InstitucionalEmail;
  registrationNumber: string | null;
  passwordHash: string | null;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  status: AccountStatus;
  createdAt: DateTime;
  updatedAt: DateTime | null;
  blockedAt: DateTime | null;
  blockedBy: UserId | null;
  deactivatedAt: DateTime | null;
  deactivatedBy: UserId | null;
};

export type User = UserDto;

export const UserSchema = z.object({
  id: UserIdSchema,
  name: z.string(),
  social_name: z.string().nullable(),
  email: EmailSchema,
  institutional_email: InstitucionalEmailSchema,
  registration_number: z.string().nullable(),
  password_hash: z.string().nullable(),
  mfa_enabled: z.boolean(),
  mfa_secret: z.string().nullable(),
  status: AccountStatusSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema.nullable(),
  blocked_at: DateTimeSchema.nullable(),
  blocked_by: UserIdSchema.nullable(),
  deactivated_at: DateTimeSchema.nullable(),
  deactivated_by: UserIdSchema.nullable(),
});
