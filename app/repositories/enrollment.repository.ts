import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

const withAcademicData = {
  classGroup: { include: { subject: true, academicPeriod: true } },
  grade: true,
} satisfies Prisma.EnrollmentInclude;

export class EnrollmentRepository {
  constructor(private readonly client: DbExecutor = db) {}

  listForStudent(studentId: string) {
    return withRepositoryErrors(() =>
      this.client.enrollment.findMany({
        where: { studentId, status: { not: "CANCELLED" } },
        include: withAcademicData,
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  findActiveByStudentAndClass(studentId: string, classGroupId: string) {
    return withRepositoryErrors(() =>
      this.client.enrollment.findFirst({
        where: { studentId, classGroupId, status: "ACTIVE" },
      }),
    );
  }

  findByIdWithClass(id: string) {
    return withRepositoryErrors(() =>
      this.client.enrollment.findUnique({
        where: { id },
        include: { classGroup: { include: { subject: true, academicPeriod: true } } },
      }),
    );
  }

  createMany(data: Prisma.EnrollmentCreateManyInput[]) {
    return withRepositoryErrors(() => this.client.enrollment.createMany({ data }));
  }

  /** Matrícula criada pela secretaria no cadastro; idempotente por aluno/turma. */
  upsertForStudent(input: { studentId: string; classGroupId: string; createdBy: string }) {
    return withRepositoryErrors(() =>
      this.client.enrollment.upsert({
        where: {
          studentId_classGroupId: {
            studentId: input.studentId,
            classGroupId: input.classGroupId,
          },
        },
        create: { ...input, status: "ACTIVE", isDependency: false },
        update: { status: "ACTIVE" },
      }),
    );
  }

  listForClassGroup(classGroupId: string) {
    return withRepositoryErrors(() =>
      this.client.enrollment.findMany({
        where: { classGroupId, status: "ACTIVE" },
        include: {
          student: { select: { name: true, socialName: true, registrationNumber: true } },
          grade: true,
        },
        orderBy: { student: { name: "asc" } },
      }),
    );
  }
}
