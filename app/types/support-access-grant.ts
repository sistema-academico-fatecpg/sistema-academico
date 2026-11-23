import { z } from "zod";
import type { DateTime, SupportAccessGrantId, SupportAccessStatus, UserId } from "./common";
import {
  DateTimeSchema,
  SupportAccessGrantIdSchema,
  SupportAccessStatusSchema,
  UserIdSchema,
} from "./common";

/**
 * Concesso de acesso de suporte temporário (tabela support_access_grants).
 *
 * Perfil Suporte Técnico sem nenhuma permissão permanente, ativado apenas
 * por solicitação aprovada pelo Auditor (seção 10.8 da Política de
 * Segurança).
 */
export type SupportAccessGrantInput = {
  userId: UserId;
  requestedBy: UserId;
  approvedBy: UserId | null;
  reason: string;
  status: SupportAccessStatus;
  startsAt: DateTime | null;
  expiresAt: DateTime | null;
};

export const SupportAccessGrantInputSchema = z.object({
  user_id: UserIdSchema,
  requested_by: UserIdSchema,
  approved_by: UserIdSchema.nullable(),
  reason: z.string().min(1),
  status: SupportAccessStatusSchema,
  starts_at: DateTimeSchema.nullable(),
  expires_at: DateTimeSchema.nullable(),
});

export type SupportAccessGrant = {
  id: SupportAccessGrantId;
  userId: UserId;
  requestedBy: UserId;
  approvedBy: UserId | null;
  reason: string;
  status: SupportAccessStatus;
  startsAt: DateTime | null;
  expiresAt: DateTime | null;
  createdAt: DateTime;
};

export const SupportAccessGrantSchema = z.object({
  id: SupportAccessGrantIdSchema,
  user_id: UserIdSchema,
  requested_by: UserIdSchema,
  approved_by: UserIdSchema.nullable(),
  reason: z.string().min(1),
  status: SupportAccessStatusSchema,
  starts_at: DateTimeSchema.nullable(),
  expires_at: DateTimeSchema.nullable(),
  created_at: DateTimeSchema,
});
