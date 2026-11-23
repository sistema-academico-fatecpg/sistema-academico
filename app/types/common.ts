import { z } from "zod";

/**
 * Tipos e schemas compartilhados pelo domínio.
 *
 * Os IDs são UUID com marcação nominal (branded types) para impedir que um
 * identificador de usuário seja usado, por engano, como identificador de log.
 */

export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

export type BrandedId<Name extends string> = Uuid & { readonly __brand: Name };

export type UserId = BrandedId<"UserId">;
export type RoleId = BrandedId<"RoleId">;
export type PermissionId = BrandedId<"PermissionId">;
export type TokenId = BrandedId<"TokenId">;
export type LogId = BrandedId<"LogId">;
export type CriticalOperationRequestId = BrandedId<"CriticalOperationRequestId">;
export type SupportAccessGrantId = BrandedId<"SupportAccessGrantId">;
export type AuditAlertId = BrandedId<"AuditAlertId">;
export type CourseId = BrandedId<"CourseId">;
export type AcademicPeriodId = BrandedId<"AcademicPeriodId">;
export type SubjectId = BrandedId<"SubjectId">;
export type ClassGroupId = BrandedId<"ClassGroupId">;
export type EnrollmentId = BrandedId<"EnrollmentId">;
export type GradeId = BrandedId<"GradeId">;

function brandedId<Name extends string>() {
  return UuidSchema as unknown as z.ZodType<BrandedId<Name>>;
}

export const UserIdSchema = brandedId<"UserId">();
export const RoleIdSchema = brandedId<"RoleId">();
export const PermissionIdSchema = brandedId<"PermissionId">();
export const TokenIdSchema = brandedId<"TokenId">();
export const LogIdSchema = brandedId<"LogId">();
export const CriticalOperationRequestIdSchema = brandedId<"CriticalOperationRequestId">();
export const SupportAccessGrantIdSchema = brandedId<"SupportAccessGrantId">();
export const AuditAlertIdSchema = brandedId<"AuditAlertId">();
export const CourseIdSchema = brandedId<"CourseId">();
export const AcademicPeriodIdSchema = brandedId<"AcademicPeriodId">();
export const SubjectIdSchema = brandedId<"SubjectId">();
export const ClassGroupIdSchema = brandedId<"ClassGroupId">();
export const EnrollmentIdSchema = brandedId<"EnrollmentId">();
export const GradeIdSchema = brandedId<"GradeId">();

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "E-mail inválido");
export type Email = z.infer<typeof EmailSchema>;

export const InstitucionalEmailSchema = EmailSchema;
export type InstitucionalEmail = z.infer<typeof InstitucionalEmailSchema>;

export const DateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data e hora inválidas (ISO 8601)");
export type DateTime = z.infer<typeof DateTimeSchema>;

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");
export type DateString = z.infer<typeof DateStringSchema>;

// ---------------------------------------------------------------------------
// Enums do domínio (espelham prisma/schema.prisma)
// ---------------------------------------------------------------------------

export const RoleNameSchema = z.enum([
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "PROFESSOR",
  "ALUNO",
  "AUDITOR",
  "SUPORTE_TECNICO",
]);
export type RoleName = z.infer<typeof RoleNameSchema>;

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
  "ROLES",
  "COURSES",
  "PERIODS",
  "SUBJECTS",
  "CLASSES",
  "ENROLLMENTS",
  "GRADES",
  "AUDIT_LOGS",
  "BACKUPS",
  "REPORTS",
]);
export type SystemModule = z.infer<typeof SystemModuleSchema>;

export const PermissionActionSchema = z.enum([
  "READ",
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT",
  "APPROVE",
]);
export type PermissionAction = z.infer<typeof PermissionActionSchema>;

export const OperationResultSchema = z.enum(["SUCCESS", "FAILURE"]);
export type OperationResult = z.infer<typeof OperationResultSchema>;

export const ApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "CANCELLED",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const CriticalOperationTypeSchema = z.enum([
  "GRANT_REVOKE_ADMIN_PERMISSION",
  "INCLUDE_OR_REPLACE_ADMIN_MASTER",
  "GRADE_CORRECTION_AFTER_CLOSING",
  "ENROLLMENT_RULE_EXCEPTION",
  "ACADEMIC_RECORD_DELETION",
  "MASS_PERSONAL_DATA_EXPORT",
  "DATA_RESTORE_AFTER_INCIDENT",
  "RESET_SECOND_FACTOR",
]);
export type CriticalOperationType = z.infer<typeof CriticalOperationTypeSchema>;

export const SupportAccessStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
]);
export type SupportAccessStatus = z.infer<typeof SupportAccessStatusSchema>;

export const AlertTypeSchema = z.enum([
  "PERMISSION_CHANGED",
  "LOGIN_FAILURE_SEQUENCE",
  "GRADE_CHANGE_OUTSIDE_PERIOD",
  "MASS_EXPORT",
  "SELF_APPROVAL_ATTEMPT",
  "MASTER_ACCOUNTS_BELOW_MINIMUM",
  "SUPPORT_ACCESS_USED",
  "EMERGENCY_MASTER_ACCOUNT",
]);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const EnrollmentStatusSchema = z.enum(["ACTIVE", "CANCELLED", "COMPLETED"]);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

export const GradeStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export type GradeStatus = z.infer<typeof GradeStatusSchema>;
