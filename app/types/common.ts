import { z } from "zod";

/**
 * UUID genérico (v4). Usado como base para os IDs específicos de cada
 * entidade, evitando confundir IDs de tabelas diferentes (ex.: UserId
 * nunca deve ser usado como LogId).
 */
export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

/**
 * Identificadores específicos de cada entidade (marcados nominalmente).
 * Cada tabela tem seu próprio tipo de ID para evitar confusão entre elas.
 */
export type UserId = UUID & { readonly __brand: "UserId" };
export type TokenId = UUID & { readonly __brand: "TokenId" };
export type MfaRecoveryCodeId = UUID & { readonly __brand: "MfaRecoveryCodeId" };
export type SupportAccessGrantId = UUID & { readonly __brand: "SupportAccessGrantId" };
export type SupportAccessModuleId = UUID & { readonly __brand: "SupportAccessModuleId" };
export type CriticalOperationRequestId = UUID & { readonly __brand: "CriticalOperationRequestId" };
export type LogId = UUID & { readonly __brand: "LogId" };

/**
 * Schemas Zod para os IDs. Na validação são apenas UUID; a marca
 * (__brand) existe apenas no nível de TypeScript.
 */
export const UserIdSchema = UUIDSchema as unknown as z.ZodType<UserId>;
export const TokenIdSchema = UUIDSchema as unknown as z.ZodType<TokenId>;
export const MfaRecoveryCodeIdSchema = UUIDSchema as unknown as z.ZodType<MfaRecoveryCodeId>;
export const SupportAccessGrantIdSchema = UUIDSchema as unknown as z.ZodType<SupportAccessGrantId>;
export const SupportAccessModuleIdSchema =
  UUIDSchema as unknown as z.ZodType<SupportAccessModuleId>;
export const CriticalOperationRequestIdSchema =
  UUIDSchema as unknown as z.ZodType<CriticalOperationRequestId>;
export const LogIdSchema = UUIDSchema as unknown as z.ZodType<LogId>;

/**
 * Endereço de e-mail (Zod v4: .email() deprecated, usa refine).
 */
export const EmailSchema = z
  .string()
  .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: "E-mail inválido" });
export type Email = z.infer<typeof EmailSchema>;

export const InstitucionalEmailSchema = EmailSchema;
export type InstitucionalEmail = z.infer<typeof InstitucionalEmailSchema>;

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
 * Enums do banco de dados (DBML).
 */

export const RoleSchema = z.enum([
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "PROFESSOR",
  "ALUNO",
  "AUDITOR",
  "SUPORTE_TECNICO",
]);
export type Role = z.infer<typeof RoleSchema>;

export const AccountStatusSchema = z.enum(["PENDING_ACTIVATION", "ACTIVE", "BLOCKED", "INACTIVE"]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

export const TokenPurposeSchema = z.enum([
  "ACCOUNT_ACTIVATION",
  "EMAIL_CONFIRMATION",
  "PASSWORD_RESET",
]);
export type TokenPurpose = z.infer<typeof TokenPurposeSchema>;

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

export const OperationResultSchema = z.enum(["SUCCESS", "FAILURE"]);
export type OperationResult = z.infer<typeof OperationResultSchema>;

export const SupportAccessStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
]);
export type SupportAccessStatus = z.infer<typeof SupportAccessStatusSchema>;

export const ApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "CANCELLED",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const OperationSchema = z.enum(["READ", "SAVE", "REMOVE"]);
export type Operation = z.infer<typeof OperationSchema>;

export const RecoveryCodeSchema = z
  .string()
  .refine((val) => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(val), {
    message: "Código de recuperação deve ter 16 caracteres em 4 blocos de 4",
  });
export type RecoveryCode = z.infer<typeof RecoveryCodeSchema>;
