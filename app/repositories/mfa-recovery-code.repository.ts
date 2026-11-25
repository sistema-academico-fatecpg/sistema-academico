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

  /** 8.3.6: localiza e consome um código de recuperação pelo hash (uso único). */
  async consumeByHash(userId: string, codeHash: string): Promise<boolean> {
    return withRepositoryErrors(async () => {
      const record = await this.client.mfaRecoveryCode.findFirst({
        where: { userId, codeHash, usedAt: null },
      });
      if (!record) return false;
      await this.client.mfaRecoveryCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return true;
    });
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
