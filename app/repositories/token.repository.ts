import { Prisma, Token, TokenPurpose } from "@prisma/client";
import { BaseRepository } from "@/repositories/base.repository";
import { db } from "@/lib/db";

type TokenCreateInput = Prisma.TokenCreateInput;
type TokenUpdateInput = Prisma.TokenUpdateInput;
type TokenWhereInput = Prisma.TokenWhereInput;

export class TokenRepository extends BaseRepository<Token, TokenCreateInput, TokenUpdateInput, TokenWhereInput> {
  constructor(prisma = db) {
    super("token", prisma);
  }

  async findByTokenHash(tokenHash: string): Promise<Token | null> {
    return this.findUnique({ tokenHash } as TokenWhereInput);
  }

  async findByUserAndPurpose(userId: string, purpose: TokenPurpose): Promise<Token[]> {
    const model = this.prisma.token as unknown as {
      findMany: (args: {
        where: {
          userId: string;
          purpose: TokenPurpose;
        };
      }) => Promise<Token[]>;
    };
    return model.findMany({
      where: {
        userId,
        purpose,
      },
    });
  }

  async findUnexpiredByPurpose(userId: string, purpose: TokenPurpose): Promise<Token | null> {
    const tokens = await this.findByUserAndPurpose(userId, purpose);
    const now = new Date();
    return tokens.find((t) => t.expiresAt > now && !t.usedAt) || null;
  }

  async markAsUsed(tokenId: string): Promise<Token> {
    return this.update(
      { id: tokenId } as TokenWhereInput,
      {
        usedAt: new Date(),
      } as TokenUpdateInput
    );
  }

  async deleteExpired(): Promise<{ count: number }> {
    const model = this.prisma.token as unknown as {
      deleteMany: (args: {
        where: {
          expiresAt: {
            lt: Date;
          };
        };
      }) => Promise<{ count: number }>;
    };
    return model.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async deleteByUserAndPurpose(userId: string, purpose: TokenPurpose): Promise<void> {
    await this.prisma.token.deleteMany({
      where: {
        userId,
        purpose,
      },
    });
  }
}

export const tokenRepository = new TokenRepository();
