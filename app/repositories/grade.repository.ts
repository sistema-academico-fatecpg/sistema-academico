import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

export class GradeRepository {
  constructor(private readonly client: DbExecutor = db) {}

  findByEnrollment(enrollmentId: string) {
    return withRepositoryErrors(() => this.client.grade.findUnique({ where: { enrollmentId } }));
  }

  historyForEnrollment(enrollmentId: string) {
    return withRepositoryErrors(() =>
      this.client.gradeHistory.findMany({
        where: { grade: { enrollmentId } },
        orderBy: { changedAt: "desc" },
      }),
    );
  }

  /** Lançamento dentro da janela: cria ou atualiza e registra histórico. */
  async setGrade(input: {
    enrollmentId: string;
    professorId: string;
    value: number;
    reason?: string | null;
  }) {
    return withRepositoryErrors(() =>
      this.client.$transaction(async (tx) => {
        const existing = await tx.grade.findUnique({ where: { enrollmentId: input.enrollmentId } });
        const grade = existing
          ? await tx.grade.update({
              where: { id: existing.id },
              data: { value: input.value, status: "PUBLISHED" },
            })
          : await tx.grade.create({
              data: {
                enrollmentId: input.enrollmentId,
                professorId: input.professorId,
                value: input.value,
                status: "PUBLISHED",
              },
            });

        await tx.gradeHistory.create({
          data: {
            gradeId: grade.id,
            oldValue: existing?.value ?? null,
            newValue: input.value,
            changedBy: input.professorId,
            reason: input.reason ?? null,
          },
        });
        return grade;
      }),
    );
  }
}
