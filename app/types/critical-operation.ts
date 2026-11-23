import { z } from "zod";
import {
  ApprovalStatusSchema,
  CriticalOperationRequestIdSchema,
  CriticalOperationTypeSchema,
  type DateTime,
  DateTimeSchema,
  SystemModuleSchema,
  UserIdSchema,
} from "./common";

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
  endsAt: DateTimeSchema,
});
export type SupportAccessRequestInput = z.infer<typeof SupportAccessRequestSchema>;

export const SupportAccessDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});

export const CriticalOperationIdSchema = CriticalOperationRequestIdSchema;
export const CriticalUserNameSchema = z.object({});
export const CriticalRequesterSchema = z.object({ userId: UserIdSchema });
