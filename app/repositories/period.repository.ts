import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

export class AcademicPeriodRepository {
  constructor(private readonly client: DbExecutor = db) {}

  list() {
    return withRepositoryErrors(() =>
      this.client.academicPeriod.findMany({ orderBy: [{ year: "desc" }, { semester: "desc" }] }),
    );
  }

  findById(id: string) {
    return withRepositoryErrors(() => this.client.academicPeriod.findUnique({ where: { id } }));
  }

  findCurrent() {
    return withRepositoryErrors(() =>
      this.client.academicPeriod.findFirst({ where: { isCurrent: true } }),
    );
  }

  create(data: Prisma.AcademicPeriodCreateInput) {
    return withRepositoryErrors(() => this.client.academicPeriod.create({ data }));
  }

  update(id: string, data: Prisma.AcademicPeriodUpdateInput) {
    return withRepositoryErrors(() => this.client.academicPeriod.update({ where: { id }, data }));
  }

  setCurrent(id: string) {
    return withRepositoryErrors(() =>
      this.client.$transaction(async (tx) => {
        await tx.academicPeriod.updateMany({ data: { isCurrent: false } });
        return tx.academicPeriod.update({ where: { id }, data: { isCurrent: true } });
      }),
    );
  }

  setGradesWindow(id: string, opensAt: Date | null, closesAt: Date | null) {
    return withRepositoryErrors(() =>
      this.client.academicPeriod.update({
        where: { id },
        data: { gradesOpenAt: opensAt, gradesCloseAt: closesAt },
      }),
    );
  }

  closeGrades(id: string) {
    return withRepositoryErrors(() =>
      this.client.academicPeriod.update({
        where: { id },
        data: { gradesCloseAt: new Date() },
      }),
    );
  }
}
