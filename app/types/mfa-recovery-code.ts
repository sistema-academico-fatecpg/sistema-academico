import { z } from "zod";
import type { DateTime, MfaRecoveryCodeId, UserId } from "./common";
import { DateTimeSchema, MfaRecoveryCodeIdSchema, UserIdSchema } from "./common";

/**
 * Código de recuperação de MFA (tabela mfa_recovery_codes).
 *
 * Geração de 10 códigos de uso único ao configurar o segundo fator
 * (seção 8.3.6 da Política de Segurança).
 */
export type MfaRecoveryCodeInput = {
  userId: UserId;
  codeHash: string;
};

export const MfaRecoveryCodeInputSchema = z.object({
  user_id: UserIdSchema,
  code_hash: z.string().min(1),
});

export type MfaRecoveryCode = {
  id: MfaRecoveryCodeId;
  userId: UserId;
  codeHash: string;
  createdAt: DateTime;
  usedAt: DateTime | null;
};

export const MfaRecoveryCodeSchema = z.object({
  id: MfaRecoveryCodeIdSchema,
  user_id: UserIdSchema,
  code_hash: z.string().min(1),
  created_at: DateTimeSchema,
  used_at: DateTimeSchema.nullable(),
});
