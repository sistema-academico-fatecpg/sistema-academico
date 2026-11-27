import { z } from "zod";
import { EmailSchema, UserIdSchema } from "./common";

export const DataSubjectRequestTypeSchema = z.enum(["ACCESS", "CORRECTION", "COPY", "ELIMINATION"]);
export type DataSubjectRequestType = z.infer<typeof DataSubjectRequestTypeSchema>;

export const DataSubjectRequestInputSchema = z.object({
  type: DataSubjectRequestTypeSchema,
  reason: z.string().trim().min(10).max(2000),
  payload: z
    .object({
      socialName: z.string().trim().max(150).nullable().optional(),
      personalEmail: EmailSchema.nullable().optional(),
    })
    .optional(),
});
export type DataSubjectRequestInput = z.infer<typeof DataSubjectRequestInputSchema>;

export const DataSubjectDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});

/**
 * 11.1.3: o consentimento não aceita `birthDate` — a idade é validada no
 * servidor a partir da data armazenada no cadastro do aluno. Campos extras
 * (inclusive uma tentativa de enviar `birthDate`) são recusados.
 */
export const GuardianConsentSchema = z
  .object({
    guardianName: z.string().trim().min(3).max(150),
    studentId: UserIdSchema.optional(),
  })
  .strict();
