import { z } from "zod";
import type { DateTime, EnrollmentId, UserId } from "./common";
import { DateTimeSchema, EnrollmentIdSchema, UserIdSchema } from "./common";

export type EnrollmentInput = {
  userId: UserId;
  periodId: UserId;
  disciplineId: UserId;
};

export const EnrollmentInputSchema = z.object({
  userId: UserIdSchema,
  periodId: UserIdSchema,
  disciplineId: UserIdSchema,
});

export type Enrollment = {
  id: EnrollmentId;
  userId: UserId;
  periodId: UserId;
  disciplineId: UserId;
  enrolledAt: DateTime;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
};

export const EnrollmentSchema = z.object({
  id: EnrollmentIdSchema,
  userId: UserIdSchema,
  periodId: UserIdSchema,
  disciplineId: UserIdSchema,
  enrolled_at: DateTimeSchema,
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
});
