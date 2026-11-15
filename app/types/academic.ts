import { z } from "zod";
import type { DateTime, PeriodId, SubjectId, UserId } from "./common";
import { DateTimeSchema, PeriodIdSchema, SubjectIdSchema, UserIdSchema } from "./common";

export type CourseInput = {
  name: string;
  code: string;
  description: string | null;
};

export const CourseInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório").toUpperCase(),
  description: z.string().nullable(),
});

export type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export const CourseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});

export type PeriodInput = {
  name: string;
  code: string;
  startDate: DateTime;
  endDate: DateTime;
  isActive: boolean;
  courseId: string;
};

export const PeriodInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório").toUpperCase(),
  startDate: DateTimeSchema,
  endDate: DateTimeSchema,
  isActive: z.boolean().default(false),
  courseId: PeriodIdSchema,
});

export type Period = {
  id: PeriodId;
  name: string;
  code: string;
  startDate: DateTime;
  endDate: DateTime;
  isActive: boolean;
  courseId: string;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export const PeriodSchema = z.object({
  id: PeriodIdSchema,
  name: z.string(),
  code: z.string(),
  startDate: DateTimeSchema,
  endDate: DateTimeSchema,
  isActive: z.boolean(),
  courseId: PeriodIdSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});

export type SubjectInput = {
  name: string;
  code: string;
  courseId: string;
  periodId: string;
};

export const SubjectInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório").toUpperCase(),
  courseId: z.string().uuid(),
  periodId: z.string().uuid(),
});

export type Subject = {
  id: SubjectId;
  name: string;
  code: string;
  courseId: string;
  periodId: string;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export const SubjectSchema = z.object({
  id: SubjectIdSchema,
  name: z.string(),
  code: z.string(),
  courseId: z.string().uuid(),
  periodId: z.string().uuid(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});

export type EnrollmentInput = {
  studentId: UserId;
  subjectId: SubjectId;
};

export const EnrollmentInputSchema = z.object({
  studentId: UserIdSchema,
  subjectId: SubjectIdSchema,
});

export type Enrollment = {
  id: string;
  studentId: UserId;
  subjectId: SubjectId;
  enrolledAt: DateTime;
  status: string;
  finalGrade: number | null;
};

export const EnrollmentSchema = z.object({
  id: z.string().uuid(),
  studentId: UserIdSchema,
  subjectId: SubjectIdSchema,
  enrolledAt: DateTimeSchema,
  status: z.string(),
  finalGrade: z.number().nullable(),
});

export type GradeInput = {
  enrollmentId: string;
  value: number;
  type: string;
  recordedBy: UserId;
};

export const GradeInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  value: z.number().min(0).max(10),
  type: z.string().default("EXAM"),
  recordedBy: UserIdSchema,
});

export type Grade = {
  id: string;
  enrollmentId: string;
  value: number;
  type: string;
  recordedAt: DateTime;
  recordedBy: UserId;
};

export const GradeSchema = z.object({
  id: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  value: z.number(),
  type: z.string(),
  recordedAt: DateTimeSchema,
  recordedBy: UserIdSchema,
});
