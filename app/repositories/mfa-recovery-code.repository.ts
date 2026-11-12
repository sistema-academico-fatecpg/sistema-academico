import { Prisma, MfaRecoveryCode } from "@prisma/client";
import { BaseRepository } from "@/repositories/base.repository";
import { db } from "@/lib/db";

type MfaRecoveryCodeCreateInput = Prisma.MfaRecoveryCodeCreateInput;
type MfaRecoveryCodeWhereInput = Prisma.MfaRecoveryCodeWhereInput;

export class MfaRecoveryCodeRepository extends BaseRepository<
  MfaRecoveryCode,
  MfaRecoveryCodeCreateInput,
  never,
  MfaRecoveryCodeWhereInput
> {
  constructor(prisma = db) {
    super("mfaRecoveryCode", prisma);
  }

  async findByUser(userId: string): Promise<MfaRecoveryCode[]> {
    return this.findMany({
      where: { userId } as MfaRecoveryCodeWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async findUnusedByUser(userId: string): Promise<MfaRecoveryCode[]> {
    return this.findMany({
      where: {
        userId,
        usedAt: null,
      } as MfaRecoveryCodeWhereInput,
    });
  }

  async markAsUsed(codeId: string): Promise<MfaRecoveryCode> {
    const model = this.prisma.mfaRecoveryCode as unknown as {
      update: (args: {
        where: { id: string };
        data: { usedAt: Date };
      }) => Promise<MfaRecoveryCode>;
    };
    return model.update({
      where: { id: codeId },
      data: { usedAt: new Date() },
    });
  }

  async deleteUsedByUser(userId: string): Promise<{ count: number }> {
    const model = this.prisma.mfaRecoveryCode as unknown as {
      deleteMany: (args: {
        where: {
          userId: string;
          usedAt: {
            not: null;
          };
        };
      }) => Promise<{ count: number }>;
    };
    return model.deleteMany({
      where: {
        userId,
        usedAt: {
          not: null,
        },
      },
    });
  }
}

export const mfaRecoveryCodeRepository = new MfaRecoveryCodeRepository();
