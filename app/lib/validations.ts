import { z } from "zod";

export const UUIDSchema = z.string().uuid("UUID inválido");

export const EmailSchema = z.string().email("Email inválido");

export const PasswordSchema = z
  .string()
  .min(12, "Senha deve ter no mínimo 12 caracteres")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial");

export const RoleNameSchema = z.enum([
  "ADMIN_MASTER",
  "ADMIN_SECUNDARIO",
  "PROFESSOR",
  "ALUNO",
  "AUDITOR",
  "SUPORTE_TECNICO",
]);

export const AccountStatusSchema = z.enum([
  "PENDING_ACTIVATION",
  "ACTIVE",
  "BLOCKED",
  "INACTIVE",
]);

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

export const OperationSchema = z.enum(["READ", "SAVE", "REMOVE"]);

export const OperationResultSchema = z.enum(["SUCCESS", "FAILURE"]);

export const SupportAccessStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
]);

export const ApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "CANCELLED",
]);

export const UserInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  socialName: z.string().optional().nullable(),
  email: EmailSchema,
  institutionalEmail: EmailSchema,
  registrationNumber: z.string().optional().nullable(),
  role: RoleNameSchema,
});

export const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  socialName: z.string().optional().nullable(),
  email: EmailSchema.optional(),
  institutionalEmail: EmailSchema.optional(),
  registrationNumber: z.string().optional().nullable(),
  status: AccountStatusSchema.optional(),
  role: RoleNameSchema.optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

export const TokenInputSchema = z.object({
  userId: UUIDSchema,
  purpose: z.enum([
    "ACCOUNT_ACTIVATION",
    "EMAIL_CONFIRMATION",
    "PASSWORD_RESET",
  ]),
  expiresAt: z.string().datetime(),
});

export const LogInputSchema = z.object({
  userId: UUIDSchema.optional().nullable(),
  role: z.string().optional().nullable(),
  ipAddress: z.string().min(1, "IP é obrigatório"),
  action: z.string().min(1, "Ação é obrigatória"),
  module: SystemModuleSchema,
  recordType: z.string().optional().nullable(),
  recordId: z.string().optional().nullable(),
  oldValue: z.unknown().optional().nullable(),
  newValue: z.unknown().optional().nullable(),
  result: OperationResultSchema,
});

export const CriticalOperationRequestInputSchema = z.object({
  requestedBy: UUIDSchema,
  operation: z.string().min(1, "Operação é obrigatória"),
  module: SystemModuleSchema.optional().nullable(),
  recordType: z.string().optional().nullable(),
  recordId: z.string().optional().nullable(),
  reason: z.string().min(1, "Justificativa é obrigatória"),
});

export const ApprovalActionSchema = z.object({
  requestId: UUIDSchema,
  action: z.enum(["APPROVE", "REJECT", "EXECUTE", "CANCEL"]),
});

export const SupportAccessGrantInputSchema = z.object({
  userId: UUIDSchema,
  requestedBy: UUIDSchema,
  reason: z.string().min(1, "Motivo é obrigatório"),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  modules: z.array(SystemModuleSchema).min(1, "Selecione pelo menos um módulo"),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type UserInput = z.infer<typeof UserInputSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type LogInput = z.infer<typeof LogInputSchema>;
export type CriticalOperationRequestInput = z.infer<typeof CriticalOperationRequestInputSchema>;
export type ApprovalAction = z.infer<typeof ApprovalActionSchema>;
export type SupportAccessGrantInput = z.infer<typeof SupportAccessGrantInputSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
