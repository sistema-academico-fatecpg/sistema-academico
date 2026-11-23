import { z } from "zod";
import type {
  ApprovalStatus,
  CriticalOperationRequestId,
  DateTime,
  SystemModule,
  UserId,
} from "./common";
import {
  ApprovalStatusSchema,
  CriticalOperationRequestIdSchema,
  DateTimeSchema,
  SystemModuleSchema,
  UserIdSchema,
} from "./common";

/**
 * Solicitação de operação crítica (tabela critical_operation_requests).
 *
 * Dupla aprovação obrigatória para operações sensíveis (seção 7.5 da
 * Política de Segurança). O solicitante nunca pode aprovar a própria
 * solicitação (7.5.2).
 */
export type CriticalOperationRequestInput = {
  requestedBy: UserId;
  operation: string;
  module: SystemModule | null;
  recordType: string | null;
  recordId: string | null;
  reason: string;
};

export const CriticalOperationRequestInputSchema = z.object({
  requested_by: UserIdSchema,
  operation: z.string().min(1),
  module: SystemModuleSchema.nullable(),
  record_type: z.string().nullable(),
  record_id: z.string().nullable(),
  reason: z.string().min(1),
});

export type CriticalOperationRequest = {
  id: CriticalOperationRequestId;
  requestedBy: UserId;
  approvedBy: UserId | null;
  operation: string;
  module: SystemModule | null;
  recordType: string | null;
  recordId: string | null;
  reason: string;
  status: ApprovalStatus;
  requestedAt: DateTime;
  decidedAt: DateTime | null;
  executedAt: DateTime | null;
};

export const CriticalOperationRequestSchema = z.object({
  id: CriticalOperationRequestIdSchema,
  requested_by: UserIdSchema,
  approved_by: UserIdSchema.nullable(),
  operation: z.string().min(1),
  module: SystemModuleSchema.nullable(),
  record_type: z.string().nullable(),
  record_id: z.string().nullable(),
  reason: z.string().min(1),
  status: ApprovalStatusSchema,
  requested_at: DateTimeSchema,
  decided_at: DateTimeSchema.nullable(),
  executed_at: DateTimeSchema.nullable(),
});
