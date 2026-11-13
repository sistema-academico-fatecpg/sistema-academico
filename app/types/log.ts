import { z } from "zod";
import {
  type AlertType,
  AlertTypeSchema,
  type LogId,
  OperationResultSchema,
  type RoleName,
  RoleNameSchema,
  SystemModuleSchema,
  type UserId,
  UserIdSchema,
} from "./common";

export type LogInput = {
  userId?: UserId | null;
  role?: RoleName | null;
  ipAddress: string;
  action: string;
  module: z.infer<typeof SystemModuleSchema>;
  recordType?: string | null;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  result: z.infer<typeof OperationResultSchema>;
  createdAt?: Date;
};

export const LogInputSchema = z.object({
  userId: UserIdSchema.nullable().optional(),
  role: RoleNameSchema.nullable().optional(),
  ipAddress: z.string().trim().min(1),
  action: z.string().trim().min(1).max(120),
  module: SystemModuleSchema,
  recordType: z.string().trim().max(80).nullable().optional(),
  recordId: z.string().trim().max(80).nullable().optional(),
  oldValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  result: OperationResultSchema,
});

export type LogDto = {
  id: LogId;
  userId: UserId | null;
  role: RoleName | null;
  ipAddress: string;
  action: string;
  module: z.infer<typeof SystemModuleSchema>;
  recordType: string | null;
  recordId: string | null;
  oldValue: unknown;
  newValue: unknown;
  result: z.infer<typeof OperationResultSchema>;
  createdAt: Date;
};

export const LogFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: UserIdSchema.optional(),
  module: SystemModuleSchema.optional(),
  action: z.string().trim().max(120).optional(),
  result: OperationResultSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type LogFilter = z.infer<typeof LogFilterSchema>;

export type AuditAlertDto = {
  id: string;
  type: AlertType;
  message: string;
  metadata: unknown;
  logId: LogId | null;
  acknowledgedAt: Date | null;
  createdAt: Date;
};

export const AlertFilterSchema = z.object({
  acknowledged: z.enum(["true", "false"]).optional(),
  type: AlertTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type AlertFilter = z.infer<typeof AlertFilterSchema>;

/** Campos que nunca podem ser persistidos em log (seção 10.5). */
export const SENSITIVE_FIELD_PATTERN =
  /(password|senha|token|secret|code|codigo|código|authorization|cookie|api[_-]?key)/i;
