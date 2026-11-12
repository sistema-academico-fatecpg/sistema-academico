import { Prisma, SupportAccessGrant, SupportAccessStatus } from "@prisma/client";
import { BaseRepository } from "@/repositories/base.repository";
import { db } from "@/lib/db";

type SupportAccessGrantCreateInput = Prisma.SupportAccessGrantCreateInput;
type SupportAccessGrantUpdateInput = Prisma.SupportAccessGrantUpdateInput;
type SupportAccessGrantWhereInput = Prisma.SupportAccessGrantWhereInput;

export class SupportAccessGrantRepository extends BaseRepository<
  SupportAccessGrant,
  SupportAccessGrantCreateInput,
  SupportAccessGrantUpdateInput,
  SupportAccessGrantWhereInput
> {
  constructor(prisma = db) {
    super("supportAccessGrant", prisma);
  }

  async findByStatus(status: SupportAccessStatus): Promise<SupportAccessGrant[]> {
    return this.findMany({
      where: { status } as SupportAccessGrantWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUser(userId: string): Promise<SupportAccessGrant[]> {
    return this.findMany({
      where: { userId } as SupportAccessGrantWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async findPending(): Promise<SupportAccessGrant[]> {
    return this.findByStatus("PENDING");
  }

  async findActive(): Promise<SupportAccessGrant[]> {
    const now = new Date();
    const model = this.prisma.supportAccessGrant as unknown as {
      findMany: (args: {
        where: {
          status: SupportAccessStatus;
          startsAt: {
            lte: Date;
          };
          expiresAt: {
            gte: Date;
          };
        };
        orderBy?: unknown;
      }) => Promise<SupportAccessGrant[]>;
    };
    return model.findMany({
      where: {
        status: "APPROVED",
        startsAt: {
          lte: now,
        },
        expiresAt: {
          gte: now,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approve(grantId: string, approverId: string): Promise<SupportAccessGrant> {
    return this.update(
      { id: grantId } as SupportAccessGrantWhereInput,
      {
        status: "APPROVED",
        approvedBy: approverId,
      } as SupportAccessGrantUpdateInput
    );
  }

  async reject(grantId: string, approverId: string): Promise<SupportAccessGrant> {
    return this.update(
      { id: grantId } as SupportAccessGrantWhereInput,
      {
        status: "REJECTED",
        approvedBy: approverId,
      } as SupportAccessGrantUpdateInput
    );
  }

  async revoke(grantId: string): Promise<SupportAccessGrant> {
    return this.update(
      { id: grantId } as SupportAccessGrantWhereInput,
      {
        status: "REVOKED",
      } as SupportAccessGrantUpdateInput
    );
  }

  async expireExpired(): Promise<{ count: number }> {
    const now = new Date();
    const model = this.prisma.supportAccessGrant as unknown as {
      updateMany: (args: {
        where: {
          status: SupportAccessStatus;
          expiresAt: {
            lt: Date;
          };
        };
        data: {
          status: SupportAccessStatus;
        };
      }) => Promise<{ count: number }>;
    };
    return model.updateMany({
      where: {
        status: "APPROVED",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });
  }
}

export const supportAccessGrantRepository = new SupportAccessGrantRepository();
