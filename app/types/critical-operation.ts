import { z } from "zod";
import {
  ApprovalStatusSchema,
  ClassGroupIdSchema,
  CriticalOperationRequestIdSchema,
  CriticalOperationTypeSchema,
  type DateTime,
  DateTimeSchema,
  EnrollmentIdSchema,
  RoleNameSchema,
  SystemModuleSchema,
  UserIdSchema,
} from "./common";
import { UserInputSchema } from "./user";

export const CriticalOperationRequestInputSchema = z.object({
  operation: CriticalOperationTypeSchema,
  module: SystemModuleSchema.optional(),
  recordType: z.string().trim().max(80).optional(),
  recordId: z.string().trim().max(80).optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Justificativa obrigatória com ao menos 10 caracteres")
    .max(2000),
  payload: z.record(z.string(), z.unknown()).optional(),
  authorizationDocument: z.string().trim().max(255).optional(),
});
export type CriticalOperationRequestInput = z.infer<typeof CriticalOperationRequestInputSchema>;

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export type CriticalOperationRequestDto = {
  id: string;
  requestedBy: string;
  requesterName: string;
  approvedBy: string | null;
  approverName: string | null;
  operation: z.infer<typeof CriticalOperationTypeSchema>;
  module: z.infer<typeof SystemModuleSchema> | null;
  recordType: string | null;
  recordId: string | null;
  reason: string;
  payload: unknown;
  authorizationDocument: string | null;
  status: z.infer<typeof ApprovalStatusSchema>;
  decisionReason: string | null;
  requestedAt: DateTime;
  decidedAt: DateTime | null;
  executedAt: DateTime | null;
};

export const ApprovalFilterSchema = z.object({
  status: ApprovalStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const SupportAccessRequestSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
  modules: z.array(SystemModuleSchema).min(1).max(10),
  startsAt: DateTimeSchema.optional(),
  endsAt: DateTimeSchema,
  involvesAuditor: z.boolean().default(false),
  authorizationDocument: z.string().trim().max(255).optional(),
});
export type SupportAccessRequestInput = z.infer<typeof SupportAccessRequestSchema>;

export const SupportAccessDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});

export const CriticalOperationIdSchema = CriticalOperationRequestIdSchema;
export const CriticalUserNameSchema = z.object({});
export const CriticalRequesterSchema = z.object({ userId: UserIdSchema });

// ---------------------------------------------------------------------------
// Payloads executados após a dupla aprovação (seções 7.5 e 8.8)
// ---------------------------------------------------------------------------

const CreateAdminUserPayloadSchema = z.object({
  action: z.literal("CREATE_USER"),
  user: UserInputSchema,
  emergency: z.boolean().optional(),
  emergencyExpiresAt: DateTimeSchema.optional(),
  replaceUserId: UserIdSchema.optional(),
});

const AssignRolePayloadSchema = z.object({
  action: z.enum(["ADD_ROLE", "ASSIGN_ROLE"]),
  userId: UserIdSchema,
  role: RoleNameSchema,
});

const RemoveRolePayloadSchema = z.object({
  action: z.enum(["REMOVE_ROLE", "REVOKE_ROLE"]),
  userId: UserIdSchema,
  role: RoleNameSchema,
});

/** 7.5.4: concessão/revogação de permissões administrativas de um perfil. */
const SetRolePermissionsPayloadSchema = z.object({
  action: z.literal("SET_ROLE_PERMISSIONS"),
  roleId: z.string().uuid(),
  permissionNames: z.array(z.string().regex(/^[A-Z_]+:[A-Z_]+$/, "Permissão inválida")).max(100),
});

export const AdminAccessPayloadSchema = z.union([
  CreateAdminUserPayloadSchema,
  AssignRolePayloadSchema,
  RemoveRolePayloadSchema,
  SetRolePermissionsPayloadSchema,
]);

export const GradeCorrectionPayloadSchema = z.object({
  enrollmentId: EnrollmentIdSchema,
  value: z.coerce.number().min(0).max(10),
  reason: z.string().trim().min(10).max(1000),
});

export const AcademicRecordDeletionPayloadSchema = z.object({
  enrollmentId: EnrollmentIdSchema,
  reason: z.string().trim().min(10).max(1000),
});

export const EnrollmentExceptionPayloadSchema = z.object({
  studentId: UserIdSchema,
  classGroupId: ClassGroupIdSchema,
  isDependency: z.boolean().default(false),
  justification: z.string().trim().min(10).max(1000),
});

export const MassExportPayloadSchema = z.object({
  scope: z.enum(["ENROLLMENTS", "GRADES", "USERS"]),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export const DataRestorePayloadSchema = z.object({
  backupId: z.string().trim().min(1).max(255),
  restorePoint: DateTimeSchema.optional(),
  incidentId: z.string().trim().min(1).max(120).optional(),
});

export const ResetSecondFactorPayloadSchema = z.object({
  userId: UserIdSchema,
  identityVerifiedAt: DateTimeSchema.optional(),
});

export const EMERGENCY_MASTER_MAX_DAYS = 30;

/**
 * Valida o payload de execução de cada tipo de operação crítica. O conteúdo
 * nunca é executado como veio do cliente: ele é interpretado por um handler
 * fechado, por tipo de operação (seção 12.6).
 */
export const CriticalOperationPayloadSchemas = {
  GRANT_REVOKE_ADMIN_PERMISSION: AdminAccessPayloadSchema,
  INCLUDE_OR_REPLACE_ADMIN_MASTER: AdminAccessPayloadSchema,
  GRADE_CORRECTION_AFTER_CLOSING: GradeCorrectionPayloadSchema,
  ENROLLMENT_RULE_EXCEPTION: EnrollmentExceptionPayloadSchema,
  ACADEMIC_RECORD_DELETION: AcademicRecordDeletionPayloadSchema,
  MASS_PERSONAL_DATA_EXPORT: MassExportPayloadSchema,
  DATA_RESTORE_AFTER_INCIDENT: DataRestorePayloadSchema,
  RESET_SECOND_FACTOR: ResetSecondFactorPayloadSchema,
} as const satisfies Record<z.infer<typeof CriticalOperationTypeSchema>, z.ZodTypeAny>;
