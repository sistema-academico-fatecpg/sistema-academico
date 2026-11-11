import { z } from "zod";

/**
 * UUID genérico (v4). Usado como base para os IDs específicos de cada
 * entidade, evitando confundir IDs de tabelas diferentes.
 */
export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

/**
 * Endereço de e-mail institucional ou pessoal.
 * Zod v4: .email() está deprecated, usa refine com regex.
 */
export const EmailSchema = z
  .string()
  .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: "E-mail inválido" });
export type Email = z.infer<typeof EmailSchema>;

/**
 * Data e hora no formato ISO 8601 com fuso horário.
 * Zod v4: .datetime() está deprecated, usa refine com regex.
 */
export const DateTimeSchema = z
  .string()
  .refine((val) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val), {
    message: "Data e hora inválidas (ISO 8601)",
  });
export type DateTime = z.infer<typeof DateTimeSchema>;

/**
 * Data apenas no formato YYYY-MM-DD.
 */
export const DateStringSchema = z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
  message: "Data deve estar no formato YYYY-MM-DD",
});
export type DateString = z.infer<typeof DateStringSchema>;

export const InstitucionalEmailSchema = EmailSchema;
export type InstitucionalEmail = z.infer<typeof InstitucionalEmailSchema>;

/**
 * Identificadores específicos de cada entidade (marcados nominalmente).
 * Isso evita confundir, por exemplo, um UserId com um LogId.
 */
export type UserId = UUID & { readonly __brand: "UserId" };
export type UserRoleId = UUID & { readonly __brand: "UserRoleId" };
export type TokenId = UUID & { readonly __brand: "TokenId" };
export type MfaRecoveryCodeId = UUID & { readonly __brand: "MfaRecoveryCodeId" };
export type SupportAccessGrantId = UUID & { readonly __brand: "SupportAccessGrantId" };
export type SupportAccessModuleId = UUID & { readonly __brand: "SupportAccessModuleId" };
export type CriticalOperationRequestId = UUID & { readonly __brand: "CriticalOperationRequestId" };
export type LogId = UUID & { readonly __brand: "LogId" };

/**
 * Schemas Zod para os IDs marcados. No nível de validação são apenas UUID;
 * a marca é aplicada apenas no nível de TypeScript.
 */
export const UserIdSchema = UUIDSchema as unknown as z.ZodType<UserId>;
export const UserRoleIdSchema = UUIDSchema as unknown as z.ZodType<UserRoleId>;
export const TokenIdSchema = UUIDSchema as unknown as z.ZodType<TokenId>;
export const MfaRecoveryCodeIdSchema = UUIDSchema as unknown as z.ZodType<MfaRecoveryCodeId>;
export const SupportAccessGrantIdSchema = UUIDSchema as unknown as z.ZodType<SupportAccessGrantId>;
export const SupportAccessModuleIdSchema =
  UUIDSchema as unknown as z.ZodType<SupportAccessModuleId>;
export const CriticalOperationRequestIdSchema =
  UUIDSchema as unknown as z.ZodType<CriticalOperationRequestId>;
export const LogIdSchema = UUIDSchema as unknown as z.ZodType<LogId>;

/**
 * Enums do banco de dados (DBML).
 */

/**
 * Perfis permanentes e temporários do sistema (tabela roles enum).
 */
export const RoleNameSchema = z.enum([
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "PROFESSOR",
  "ALUNO",
  "AUDITOR",
  "SUPORTE_TECNICO",
]);
export type RoleName = z.infer<typeof RoleNameSchema>;

/**
 * Status da conta (tabela users.status).
 */
export const AccountStatusSchema = z.enum(["PENDING_ACTIVATION", "ACTIVE", "BLOCKED", "INACTIVE"]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

/**
 * Propósito do token (tabela tokens.purpose).
 */
export const TokenPurposeSchema = z.enum([
  "ACCOUNT_ACTIVATION",
  "EMAIL_CONFIRMATION",
  "PASSWORD_RESET",
]);
export type TokenPurpose = z.infer<typeof TokenPurposeSchema>;

/**
 * Módulos do sistema (tabela system_modules enum).
 */
export const SystemModuleSchema = z.enum([
  "USERS",
  "COURSES",
  "PERIODS",
  "SUBJECTS",
  "ENROLLMENTS",
  "GRADES",
  "AUDIT_LOGS",
  "BACKUPS",
]);
export type SystemModule = z.infer<typeof SystemModuleSchema>;

/**
 * Resultado da operação (tabela logs.result).
 */
export const OperationResultSchema = z.enum(["SUCCESS", "FAILURE"]);
export type OperationResult = z.infer<typeof OperationResultSchema>;

/**
 * Status do acesso de suporte (tabela support_access_grants.status).
 */
export const SupportAccessStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
]);
export type SupportAccessStatus = z.infer<typeof SupportAccessStatusSchema>;

/**
 * Status da aprovação (tabela critical_operation_requests.status).
 */
export const ApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "CANCELLED",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

/**
 * Operações disponíveis para autorização (RBAC).
 */
export const OperationSchema = z.enum(["READ", "SAVE", "REMOVE"]);
export type Operation = z.infer<typeof OperationSchema>;

export const StatusSchema = z.enum(["ACTIVE", "BLOCKED", "INACTIVE"]);
export type Status = z.infer<typeof StatusSchema>;

export const RecoveryCodeSchema = z
  .string()
  .refine((val) => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(val), {
    message: "Código de recuperação deve ter 16 caracteres em 4 blocos de 4",
  });
export type RecoveryCode = z.infer<typeof RecoveryCodeSchema>;
