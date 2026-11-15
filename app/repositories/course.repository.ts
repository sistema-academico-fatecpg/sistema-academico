import type { Course, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BaseRepository } from "@/repositories/base.repository";

type CourseCreateInput = Prisma.CourseCreateInput;
type CourseUpdateInput = Prisma.CourseUpdateInput;
type CourseWhereInput = Prisma.CourseWhereInput;

export class CourseRepository extends BaseRepository<
  Course,
  CourseCreateInput,
  CourseUpdateInput,
  CourseWhereInput
> {
  constructor(prisma = db) {
    super("course", prisma);
  }

  async findByCode(code: string): Promise<Course | null> {
    return this.findUnique({ code } as CourseWhereInput);
  }

  async findWithSubjects(): Promise<(Course & { subjects: any[] })[]> {
    const model = this.prisma.course as unknown as {
      findMany: (args: {
        include: { subjects: boolean };
      }) => Promise<(Course & { subjects: any[] })[]>;
    };
    return model.findMany({
      include: {
        subjects: true,
      },
    });
  }
}

export const courseRepository = new CourseRepository();
