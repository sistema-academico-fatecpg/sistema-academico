import type { Grade, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BaseRepository } from "@/repositories/base.repository";

type GradeCreateInput = Prisma.GradeCreateInput;
type GradeUpdateInput = Prisma.GradeUpdateInput;
type GradeWhereInput = Prisma.GradeWhereInput;

export class GradeRepository extends BaseRepository<
  Grade,
  GradeCreateInput,
  GradeUpdateInput,
  GradeWhereInput
> {
  constructor(prisma = db) {
    super("grade", prisma);
  }

  async findByEnrollment(enrollmentId: string): Promise<Grade[]> {
    const model = this.prisma.grade as unknown as {
      findMany: (args: { where: { enrollmentId: string } }) => Promise<Grade[]>;
    };
    return model.findMany({
      where: { enrollmentId },
    });
  }

  async findByStudent(studentId: string): Promise<Grade[]> {
    const model = this.prisma.grade as unknown as {
      findMany: (args: {
        where: {
          enrollment: {
            studentId: string;
          };
        };
        include: {
          enrollment: {
            include: {
              subject: true;
            };
          };
        };
      }) => Promise<Grade[]>;
    };
    return model.findMany({
      where: {
        enrollment: {
          studentId,
        },
      },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
    });
  }
}

export const gradeRepository = new GradeRepository();
