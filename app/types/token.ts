import { z } from "zod";
import type { DateTime, TokenId, TokenPurpose, UserId } from "./common";
import { DateTimeSchema, TokenIdSchema, TokenPurposeSchema, UserIdSchema } from "./common";

/**
 * Token de uso único (tabela tokens).
 *
 * Usado para ativação de conta, confirmação de e-mail e redefinição de
 * senha. O hash do token é armazenado, nunca o valor em texto puro.
 */
export type TokenInput = {
  userId: UserId;
  tokenHash: string;
  purpose: TokenPurpose;
  expiresAt: DateTime;
};

export const TokenInputSchema = z.object({
  user_id: UserIdSchema,
  token_hash: z.string().min(1),
  purpose: TokenPurposeSchema,
  expires_at: DateTimeSchema,
});

export type Token = {
  id: TokenId;
  userId: UserId;
  tokenHash: string;
  purpose: TokenPurpose;
  createdAt: DateTime;
  expiresAt: DateTime;
  usedAt: DateTime | null;
};

export const TokenSchema = z.object({
  id: TokenIdSchema,
  user_id: UserIdSchema,
  token_hash: z.string().min(1),
  purpose: TokenPurposeSchema,
  created_at: DateTimeSchema,
  expires_at: DateTimeSchema,
  used_at: DateTimeSchema.nullable(),
});
