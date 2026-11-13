import { z } from "zod";
import { type DateTime, DateTimeSchema, UserIdSchema } from "./common";

export const ScheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});
export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;

export const CreateAcademicPeriodSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    year: z.coerce.number().int().min(2000).max(2100),
    semester: z.coerce.number().int().min(1).max(2),
    enrollmentOpensAt: DateTimeSchema,
    enrollmentClosesAt: DateTimeSchema,
    gradesOpenAt: DateTimeSchema.optional(),
    gradesCloseAt: DateTimeSchema.optional(),
    isCurrent: z.boolean().default(false),
  })
  .refine((data) => new Date(data.enrollmentOpensAt) < new Date(data.enrollmentClosesAt), {
    message: "Abertura da matrícula deve ser anterior ao fechamento",
    path: ["enrollmentClosesAt"],
  });
export type CreateAcademicPeriodInput = z.infer<typeof CreateAcademicPeriodSchema>;

export const GradePeriodSchema = z
  .object({
    gradesOpenAt: DateTimeSchema,
    gradesCloseAt: DateTimeSchema,
  })
  .refine((data) => new Date(data.gradesOpenAt) < new Date(data.gradesCloseAt), {
    message: "Abertura das notas deve ser anterior ao fechamento",
    path: ["gradesCloseAt"],
  });

export const CreateCourseSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(3).max(150),
});

export const CreateSubjectSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(3).max(150),
  courseId: z.string().uuid(),
  periodNumber: z.coerce.number().int().min(1).max(20),
  workloadHours: z.coerce.number().int().min(1).max(1000),
});

export const CreateClassGroupSchema = z.object({
  subjectId: z.string().uuid(),
  academicPeriodId: z.string().uuid(),
  professorId: z.string().uuid().nullable().optional(),
  room: z.string().trim().max(50).optional(),
  schedule: z.array(ScheduleSlotSchema).min(1),
});

export const EnrollSchema = z.object({
  classGroupIds: z.array(z.string().uuid()).min(1).max(20),
});

export const SetGradeSchema = z.object({
  enrollmentId: z.string().uuid(),
  value: z.coerce.number().min(0).max(10),
});

export const CorrectGradeSchema = z.object({
  enrollmentId: z.string().uuid(),
  value: z.coerce.number().min(0).max(10),
  reason: z.string().trim().min(10).max(1000),
});

export type AcademicPeriodDto = {
  id: string;
  name: string;
  year: number;
  semester: number;
  enrollmentOpensAt: DateTime;
  enrollmentClosesAt: DateTime;
  gradesOpenAt: DateTime | null;
  gradesCloseAt: DateTime | null;
  isCurrent: boolean;
};

export type ClassGroupDto = {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  periodNumber: number;
  professorId: string | null;
  professorName: string | null;
  schedule: ScheduleSlot[];
  room: string | null;
  isDependency: boolean;
  hasConflict: boolean;
};

export type StudentGradeDto = {
  enrollmentId: string;
  classGroupId: string;
  subjectCode: string;
  subjectName: string;
  professorName: string | null;
  grade: number | null;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: DateTime | null;
};

export const ExportScopeSchema = z.object({
  scope: z.enum(["ENROLLMENTS", "GRADES", "USERS"]),
  mass: z.boolean().default(false),
  reason: z.string().trim().max(1000).optional(),
  studentId: UserIdSchema.optional(),
});
export type ExportScope = z.infer<typeof ExportScopeSchema>;
