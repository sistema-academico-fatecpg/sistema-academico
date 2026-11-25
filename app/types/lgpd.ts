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

export const GuardianConsentSchema = z.object({
  guardianName: z.string().trim().min(3).max(150),
  studentId: UserIdSchema.optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento no formato YYYY-MM-DD")
    .optional(),
});
