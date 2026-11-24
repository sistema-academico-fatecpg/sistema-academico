import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

export class CourseRepository {
  constructor(private readonly client: DbExecutor = db) {}

  list() {
    return withRepositoryErrors(() =>
      this.client.course.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { subjects: true } } },
      }),
    );
  }

  findById(id: string) {
    return withRepositoryErrors(() => this.client.course.findUnique({ where: { id } }));
  }

  findByCode(code: string) {
    return withRepositoryErrors(() =>
      this.client.course.findUnique({ where: { code: code.toUpperCase() } }),
    );
  }

  create(data: { code: string; name: string }) {
    return withRepositoryErrors(() =>
      this.client.course.create({
        data: { code: data.code.toUpperCase(), name: data.name },
      }),
    );
  }

  update(id: string, data: Prisma.CourseUpdateInput) {
    return withRepositoryErrors(() => this.client.course.update({ where: { id }, data }));
  }

  countDependents(id: string) {
    return withRepositoryErrors(() =>
      this.client.course.findUnique({
        where: { id },
        select: { _count: { select: { subjects: true, profiles: true } } },
      }),
    );
  }
}
