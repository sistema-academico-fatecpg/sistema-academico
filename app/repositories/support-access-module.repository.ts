import { type DbExecutor, db } from "@/app/lib/db";
import type { SystemModule } from "@/app/types/common";
import { withRepositoryErrors } from "./errors";

export class SupportAccessModuleRepository {
  constructor(private readonly client: DbExecutor = db) {}

  listForGrant(grantId: string) {
    return withRepositoryErrors(() =>
      this.client.supportAccessModule.findMany({ where: { grantId } }),
    );
  }

  canRead(grantId: string, module: SystemModule) {
    return withRepositoryErrors(() =>
      this.client.supportAccessModule.findFirst({
        where: { grantId, module, canRead: true },
      }),
    );
  }

  add(grantId: string, module: SystemModule) {
    return withRepositoryErrors(() =>
      this.client.supportAccessModule.create({
        data: { grantId, module, canRead: true },
      }),
    );
  }

  remove(grantId: string, module: SystemModule) {
    return withRepositoryErrors(() =>
      this.client.supportAccessModule.deleteMany({ where: { grantId, module } }),
    );
  }
}
