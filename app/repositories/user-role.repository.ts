import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

export class UserRoleRepository {
  constructor(private readonly client: DbExecutor = db) {}

  listByUser(userId: string) {
    return withRepositoryErrors(() =>
      this.client.userRole.findMany({ where: { userId }, include: { role: true } }),
    );
  }

  assign(userId: string, roleId: string, assignedBy?: string | null) {
    return withRepositoryErrors(() =>
      this.client.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: { assignedBy: assignedBy ?? null, assignedAt: new Date() },
        create: { userId, roleId, assignedBy: assignedBy ?? null },
      }),
    );
  }

  remove(userId: string, roleId: string) {
    return withRepositoryErrors(() =>
      this.client.userRole.delete({ where: { userId_roleId: { userId, roleId } } }),
    );
  }
}
