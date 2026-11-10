import { z } from "zod";
import type { DateTime, RecoveryCode, RecoveryCodeId, UserId } from "./common";
import { DateTimeSchema, RecoveryCodeIdSchema, RecoveryCodeSchema, UserIdSchema } from "./common";

export type RecoveryCodeInput = {
  userId: UserId;
  code: RecoveryCode;
  used: boolean;
};

export const RecoveryCodeInputSchema = z.object({
  user_id: UserIdSchema,
  code: RecoveryCodeSchema,
  used: z.boolean().default(false),
});

export type RecoveryCodeEntity = {
  id: RecoveryCodeId;
  userId: UserId;
  code: RecoveryCode;
  used: boolean;
  createdAt: DateTime;
  usedAt: DateTime | null;
};

export const RecoveryCodeSchemaEntity = z.object({
  id: RecoveryCodeIdSchema,
  user_id: UserIdSchema,
  code: RecoveryCodeSchema,
  used: z.boolean().default(false),
  created_at: DateTimeSchema,
  used_at: DateTimeSchema.nullable(),
});
