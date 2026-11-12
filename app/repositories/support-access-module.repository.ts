import { Prisma, SupportAccessModule } from "@prisma/client";
import { BaseRepository } from "@/repositories/base.repository";
import { db } from "@/lib/db";

type SupportAccessModuleCreateInput = Prisma.SupportAccessModuleCreateInput;
type SupportAccessModuleWhereInput = Prisma.SupportAccessModuleWhereInput;

export class SupportAccessModuleRepository extends BaseRepository<
  SupportAccessModule,
  SupportAccessModuleCreateInput,
  never,
  SupportAccessModuleWhereInput
> {
  constructor(prisma = db) {
    super("supportAccessModule", prisma);
  }

  async findByGrant(grantId: string): Promise<SupportAccessModule[]> {
    return this.findMany({
      where: { grantId } as SupportAccessModuleWhereInput,
    });
  }

  async createManyForGrant(grantId: string, modules: string[]): Promise<{ count: number }> {
    return this.createMany(
      modules.map((module) => ({
        grantId,
        module: module as any,
      }))
    );
  }

  async deleteByGrant(grantId: string): Promise<{ count: number }> {
    const model = this.prisma.supportAccessModule as unknown as {
      deleteMany: (args: {
        where: {
          grantId: string;
        };
      }) => Promise<{ count: number }>;
    };
    return model.deleteMany({
      where: { grantId },
    });
  }
}

export const supportAccessModuleRepository = new SupportAccessModuleRepository();
