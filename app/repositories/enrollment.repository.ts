import type { Enrollment, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BaseRepository } from "@/repositories/base.repository";

type EnrollmentCreateInput = Prisma.EnrollmentCreateInput;
type EnrollmentUpdateInput = Prisma.EnrollmentUpdateInput;
type EnrollmentWhereInput = Prisma.EnrollmentWhereInput;

export class EnrollmentRepository extends BaseRepository<
  Enrollment,
  EnrollmentCreateInput,
  EnrollmentUpdateInput,
  EnrollmentWhereInput
> {
  constructor(prisma = db) {
    super("enrollment", prisma);
  }

  async findByStudent(studentId: string): Promise<Enrollment[]> {
    const model = this.prisma.enrollment as unknown as {
      findMany: (args: {
        where: { studentId: string };
        include: { subject: true };
      }) => Promise<Enrollment[]>;
    };
    return model.findMany({
      where: { studentId },
      include: { subject: true },
    });
  }

  async findBySubject(subjectId: string): Promise<Enrollment[]> {
    const model = this.prisma.enrollment as unknown as {
      findMany: (args: {
        where: { subjectId: string };
        include: { student: true };
      }) => Promise<Enrollment[]>;
    };
    return model.findMany({
      where: { subjectId },
      include: { student: true },
    });
  }

  async findByStudentAndSubject(studentId: string, subjectId: string): Promise<Enrollment | null> {
    const model = this.prisma.enrollment as unknown as {
      findUnique: (args: {
        where: { studentId_subjectId: { studentId: string; subjectId: string } };
      }) => Promise<Enrollment | null>;
    };
    return model.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
    });
  }

  async updateGrade(enrollmentId: string, finalGrade: number): Promise<Enrollment> {
    return this.update(
      { id: enrollmentId } as EnrollmentWhereInput,
      { finalGrade } as EnrollmentUpdateInput,
    );
  }
}

export const enrollmentRepository = new EnrollmentRepository();
