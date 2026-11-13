import { z } from "zod";
import { type DateTime, DateTimeSchema, SystemModuleSchema, UserIdSchema } from "./common";

export const SupportAccessGrantInputSchema = z.object({
  reason: z.string().trim().min(10, "Informe o motivo").max(2000),
  modules: z.array(SystemModuleSchema).min(1).max(10),
  hours: z.coerce.number().int().min(1).max(8).default(8),
});
export type SupportAccessGrantInput = z.infer<typeof SupportAccessGrantInputSchema>;

export type SupportAccessGrantDto = {
  id: string;
  requestedBy: string;
  requesterName: string;
  approvedBy: string | null;
  approverName: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "REVOKED";
  startsAt: DateTime;
  endsAt: DateTime;
  modules: string[];
  createdAt: DateTime;
  decidedAt: DateTime | null;
};

export const SupportAccessCheckSchema = z.object({
  userId: UserIdSchema,
  module: SystemModuleSchema,
});

export const SupportAccessGrantFilterSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED", "REVOKED"]).optional(),
});

export const MaxSupportAccessHours = 8;
export const SupportAccessModuleReadOnly = true;
export const SupportAccessExpirySchema = DateTimeSchema;
