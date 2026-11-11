import { z } from "zod";
import type { DateTime, LogId, OperationResult, SystemModule, UserId } from "./common";
import {
  DateTimeSchema,
  LogIdSchema,
  OperationResultSchema,
  SystemModuleSchema,
  UserIdSchema,
} from "./common";

/**
 * Registro de auditoria (tabela logs).
 *
 * Logs são imutáveis e append-only: somente inclusão, nunca alteração
 * ou exclusão (seção 10.3 da Política de Segurança). Não há updated_at,
 * apenas created_at.
 */
export type LogInput = {
  userId: UserId | null;
  role: string | null;
  ipAddress: string;
  action: string;
  module: SystemModule;
  recordType: string | null;
  recordId: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  result: OperationResult;
};

export const LogInputSchema = z.object({
  user_id: UserIdSchema.nullable(),
  role: z.string().nullable(),
  ip_address: z.string().min(1),
  action: z.string().min(1),
  module: SystemModuleSchema,
  record_type: z.string().nullable(),
  record_id: z.string().nullable(),
  old_value: z.unknown().nullable(),
  new_value: z.unknown().nullable(),
  result: OperationResultSchema,
});

export type Log = {
  id: LogId;
  userId: UserId | null;
  role: string | null;
  ipAddress: string;
  action: string;
  module: SystemModule;
  recordType: string | null;
  recordId: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  result: OperationResult;
  createdAt: DateTime;
};

export const LogSchema = z.object({
  id: LogIdSchema,
  user_id: UserIdSchema.nullable(),
  role: z.string().nullable(),
  ip_address: z.string().min(1),
  action: z.string().min(1),
  module: SystemModuleSchema,
  record_type: z.string().nullable(),
  record_id: z.string().nullable(),
  old_value: z.unknown().nullable(),
  new_value: z.unknown().nullable(),
  result: OperationResultSchema,
  created_at: DateTimeSchema,
});
