import { z } from "zod";
import type { AuditLogId, DateTime, UserId } from "./common";
import { AuditLogIdSchema, DateTimeSchema, UserIdSchema } from "./common";

export type AuditLogInput = {
  userId: UserId;
  role: string;
  ip: string;
  action: string;
  module: string;
  recordId: UserId | null;
  previousValue: string | null;
  newValue: string | null;
  success: boolean;
};

export const AuditLogInputSchema = z.object({
  user_id: UserIdSchema,
  role: z.string().min(1),
  ip: z.string().min(1),
  action: z.string().min(1),
  module: z.string().min(1),
  record_id: UserIdSchema.nullable(),
  previous_value: z.string().nullable(),
  new_value: z.string().nullable(),
  success: z.boolean(),
});

export type AuditLog = {
  id: AuditLogId;
  userId: UserId;
  role: string;
  ip: string;
  action: string;
  module: string;
  recordId: UserId | null;
  previousValue: string | null;
  newValue: string | null;
  success: boolean;
  createdAt: DateTime;
};

export const AuditLogSchema = z.object({
  id: AuditLogIdSchema,
  user_id: UserIdSchema,
  role: z.string().min(1),
  ip: z.string().min(1),
  action: z.string().min(1),
  module: z.string().min(1),
  record_id: UserIdSchema.nullable(),
  previous_value: z.string().nullable(),
  new_value: z.string().nullable(),
  success: z.boolean(),
  created_at: DateTimeSchema,
});
