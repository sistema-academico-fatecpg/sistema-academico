import { type DbExecutor, db } from "@/app/lib/db";
import type { TokenPurpose } from "@/app/types/common";
import { withRepositoryErrors } from "./errors";

export class TokenRepository {
  constructor(private readonly client: DbExecutor = db) {}

  create(input: { userId: string; purpose: TokenPurpose; tokenHash: string; expiresAt: Date }) {
    return withRepositoryErrors(() =>
      this.client.token.create({
        data: {
          userId: input.userId,
          purpose: input.purpose,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      }),
    );
  }

  findByHash(tokenHash: string) {
    return withRepositoryErrors(() =>
      this.client.token.findUnique({ where: { tokenHash }, include: { user: true } }),
    );
  }

  consume(id: string) {
    return withRepositoryErrors(() =>
      this.client.token.update({
        where: { id },
        data: { usedAt: new Date() },
      }),
    );
  }

  invalidateForUser(userId: string, purpose?: TokenPurpose) {
    return withRepositoryErrors(() =>
      this.client.token.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      }),
    );
  }

  invalidateForUserAndPurpose(userId: string, purpose: TokenPurpose) {
    return this.invalidateForUser(userId, purpose);
  }
}
