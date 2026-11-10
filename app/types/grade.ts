import { z } from "zod";
import type { DateTime, EnrollmentId, GradeId } from "./common";
import { DateTimeSchema, EnrollmentIdSchema, GradeIdSchema } from "./common";

export type GradeInput = {
  enrollmentId: EnrollmentId;
  value: number;
};

export const GradeInputSchema = z.object({
  enrollmentId: EnrollmentIdSchema,
  value: z.number().min(0).max(10),
});

export type Grade = {
  id: GradeId;
  enrollmentId: EnrollmentId;
  value: number;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export const GradeSchema = z.object({
  id: GradeIdSchema,
  enrollment_id: EnrollmentIdSchema,
  value: z.number().min(0).max(10),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});
