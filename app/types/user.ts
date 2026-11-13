import { z } from "zod";
import {
  type AccountStatus,
  AccountStatusSchema,
  type DateTime,
  DateTimeSchema,
  type Email,
  EmailSchema,
  type InstitucionalEmail,
  InstitucionalEmailSchema,
  type RoleName,
  RoleNameSchema,
  type UserId,
  UserIdSchema,
} from "./common";

export type UserInput = {
  name: string;
  socialName?: string | null;
  email: InstitucionalEmail;
  personalEmail?: Email | null;
  registrationNumber?: string | null;
  role: RoleName;
};

export const UserInputSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres").max(150),
  socialName: z.string().trim().max(150).nullable().optional(),
  email: InstitucionalEmailSchema,
  personalEmail: EmailSchema.nullable().optional(),
  registrationNumber: z.string().trim().min(1).max(30).nullable().optional(),
  role: RoleNameSchema,
});

export type UserDto = {
  id: UserId;
  name: string;
  socialName: string | null;
  email: InstitucionalEmail;
  institutionalEmail: InstitucionalEmail;
  personalEmail: Email | null;
  registrationNumber: string | null;
  role: RoleName;
  roles: RoleName[];
  status: AccountStatus;
  mfaEnabled: boolean;
  lastLoginAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export const UserDtoSchema = z.object({
  id: UserIdSchema,
  name: z.string(),
  socialName: z.string().nullable(),
  email: EmailSchema,
  institutionalEmail: EmailSchema,
  personalEmail: EmailSchema.nullable(),
  registrationNumber: z.string().nullable(),
  role: RoleNameSchema,
  roles: z.array(RoleNameSchema),
  status: AccountStatusSchema,
  mfaEnabled: z.boolean(),
  lastLoginAt: DateTimeSchema.nullable(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});

export const ListUsersQuerySchema = z.object({
  role: RoleNameSchema.optional(),
  status: AccountStatusSchema.optional(),
  search: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const BlockUserSchema = z.object({
  reason: z.string().trim().min(5, "Informe o motivo do bloqueio").max(500),
});

export const ChangeUserRoleSchema = z.object({
  role: RoleNameSchema,
  reason: z.string().trim().min(5).max(500),
});

const institutionalEmailDomain = process.env.INSTITUTIONAL_EMAIL_DOMAIN?.trim();

/** Contas genéricas (ex.: secretaria@) são proibidas pela seção 8.4.1. */
export function isGenericAccount(email: string): boolean {
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  return ["secretaria", "admin", "administrador", "suporte", "ti", "financeiro"].includes(
    localPart,
  );
}

export function isInstitutionalEmailAllowed(email: string): boolean {
  if (!institutionalEmailDomain) return true;
  return email.toLowerCase().endsWith(`@${institutionalEmailDomain.toLowerCase()}`);
}
