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
 * Isso evita confundir, por exemplo, um UserId com um EnrollmentId.
 */
export type UserId = UUID & { readonly __brand: "UserId" };
export type EnrollmentId = UUID & { readonly __brand: "EnrollmentId" };
export type GradeId = UUID & { readonly __brand: "GradeId" };
export type PeriodId = UUID & { readonly __brand: "PeriodId" };
export type AuditLogId = UUID & { readonly __brand: "AuditLogId" };
export type RecoveryCodeId = UUID & { readonly __brand: "RecoveryCodeId" };

/**
 * Schemas Zod para os IDs marcados. No nível de validação são apenas UUID;
 * a marca é aplicada apenas no nível de TypeScript.
 */
export const UserIdSchema = UUIDSchema as unknown as z.ZodType<UserId>;
export const EnrollmentIdSchema = UUIDSchema as unknown as z.ZodType<EnrollmentId>;
export const GradeIdSchema = UUIDSchema as unknown as z.ZodType<GradeId>;
export const PeriodIdSchema = UUIDSchema as unknown as z.ZodType<PeriodId>;
export const AuditLogIdSchema = UUIDSchema as unknown as z.ZodType<AuditLogId>;
export const RecoveryCodeIdSchema = UUIDSchema as unknown as z.ZodType<RecoveryCodeId>;

export const RoleNameSchema = z.enum([
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "PROFESSOR",
  "ALUNO",
  "AUDITOR",
  "SUPORTE_TECNICO",
]);
export type RoleName = z.infer<typeof RoleNameSchema>;

export const ModuleSchema = z.enum([
  "USERS",
  "GRADES",
  "ENROLLMENTS",
  "LOGS",
  "PERIODS",
  "CRITICAL_OPERATIONS",
  "EXPORT",
]);
export type Module = z.infer<typeof ModuleSchema>;

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
