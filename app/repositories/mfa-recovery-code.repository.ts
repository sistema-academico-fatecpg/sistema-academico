import { type DbExecutor, db } from "@/app/lib/db";
import { withRepositoryErrors } from "./errors";

export class MfaRecoveryCodeRepository {
  constructor(private readonly client: DbExecutor = db) {}

  createMany(userId: string, codeHashes: string[]) {
    return withRepositoryErrors(() =>
      this.client.mfaRecoveryCode.createMany({
        data: codeHashes.map((codeHash) => ({ userId, codeHash })),
      }),
    );
  }

  findUnusedByUser(userId: string) {
    return withRepositoryErrors(() =>
      this.client.mfaRecoveryCode.findMany({
        where: { userId, usedAt: null },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  consume(id: string) {
    return withRepositoryErrors(() =>
      this.client.mfaRecoveryCode.update({ where: { id }, data: { usedAt: new Date() } }),
    );
  }

  deleteAllForUser(userId: string) {
    return withRepositoryErrors(() =>
      this.client.mfaRecoveryCode.deleteMany({ where: { userId } }),
    );
  }
}
