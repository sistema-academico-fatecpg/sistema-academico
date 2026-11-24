import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

export class SubjectRepository {
  constructor(private readonly client: DbExecutor = db) {}

  list(courseId?: string) {
    return withRepositoryErrors(() =>
      this.client.subject.findMany({
        where: courseId ? { courseId } : {},
        orderBy: [{ periodNumber: "asc" }, { name: "asc" }],
        include: { course: { select: { id: true, code: true, name: true } } },
      }),
    );
  }

  findById(id: string) {
    return withRepositoryErrors(() =>
      this.client.subject.findUnique({
        where: { id },
        include: { course: true },
      }),
    );
  }

  findByCode(code: string) {
    return withRepositoryErrors(() =>
      this.client.subject.findUnique({ where: { code: code.toUpperCase() } }),
    );
  }

  create(data: Prisma.SubjectCreateInput) {
    return withRepositoryErrors(() =>
      this.client.subject.create({
        data: { ...data, code: data.code.toUpperCase() },
      }),
    );
  }

  update(id: string, data: Prisma.SubjectUpdateInput) {
    return withRepositoryErrors(() => this.client.subject.update({ where: { id }, data }));
  }
}
