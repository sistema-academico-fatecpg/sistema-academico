import type { Prisma, Subject } from "@prisma/client";
import { db } from "@/lib/db";
import { BaseRepository } from "@/repositories/base.repository";

type SubjectCreateInput = Prisma.SubjectCreateInput;
type SubjectUpdateInput = Prisma.SubjectUpdateInput;
type SubjectWhereInput = Prisma.SubjectWhereInput;

export class SubjectRepository extends BaseRepository<
  Subject,
  SubjectCreateInput,
  SubjectUpdateInput,
  SubjectWhereInput
> {
  constructor(prisma = db) {
    super("subject", prisma);
  }

  async findByCode(code: string): Promise<Subject | null> {
    return this.findUnique({ code } as SubjectWhereInput);
  }

  async findByCourse(courseId: string): Promise<Subject[]> {
    const model = this.prisma.subject as unknown as {
      findMany: (args: { where: { courseId: string } }) => Promise<Subject[]>;
    };
    return model.findMany({
      where: { courseId },
    });
  }

  async findByPeriod(periodId: string): Promise<Subject[]> {
    const model = this.prisma.subject as unknown as {
      findMany: (args: { where: { periodId: string } }) => Promise<Subject[]>;
    };
    return model.findMany({
      where: { periodId },
    });
  }

  async findWithEnrollments(): Promise<(Subject & { enrollments: any[] })[]> {
    const model = this.prisma.subject as unknown as {
      findMany: (args: {
        include: { enrollments: { include: { student: true } } };
      }) => Promise<(Subject & { enrollments: any[] })[]>;
    };
    return model.findMany({
      include: {
        enrollments: {
          include: {
            student: true,
          },
        },
      },
    });
  }
}

export const subjectRepository = new SubjectRepository();
