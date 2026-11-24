import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

const withSubject = {
  subject: true,
  academicPeriod: true,
} satisfies Prisma.ClassGroupInclude;

export class ClassGroupRepository {
  constructor(private readonly client: DbExecutor = db) {}

  findByIds(ids: readonly string[]) {
    return withRepositoryErrors(() =>
      this.client.classGroup.findMany({
        where: { id: { in: [...ids] } },
        include: withSubject,
      }),
    );
  }

  findById(id: string) {
    return withRepositoryErrors(() =>
      this.client.classGroup.findUnique({ where: { id }, include: withSubject }),
    );
  }

  /**
   * Lista somente turmas do período atual do curso do aluno e as turmas das
   * disciplinas em DP (9.1.1 e 9.1.2).
   */
  listForStudent(input: {
    courseId: string;
    currentPeriod: number;
    academicPeriodId: string;
    dependencySubjectIds: readonly string[];
  }) {
    return withRepositoryErrors(() =>
      this.client.classGroup.findMany({
        where: {
          academicPeriodId: input.academicPeriodId,
          OR: [
            {
              subject: {
                courseId: input.courseId,
                periodNumber: input.currentPeriod,
              },
            },
            { subjectId: { in: [...input.dependencySubjectIds] } },
          ],
        },
        include: withSubject,
        orderBy: [{ subject: { periodNumber: "asc" } }, { subject: { name: "asc" } }],
      }),
    );
  }

  listForProfessor(professorId: string, academicPeriodId?: string) {
    return withRepositoryErrors(() =>
      this.client.classGroup.findMany({
        where: {
          professorId,
          ...(academicPeriodId ? { academicPeriodId } : {}),
        },
        include: withSubject,
        orderBy: { subject: { name: "asc" } },
      }),
    );
  }
}
