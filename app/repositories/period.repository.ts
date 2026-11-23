import type { Period, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BaseRepository } from "@/repositories/base.repository";

type PeriodCreateInput = Prisma.PeriodCreateInput;
type PeriodUpdateInput = Prisma.PeriodUpdateInput;
type PeriodWhereInput = Prisma.PeriodWhereInput;

export class PeriodRepository extends BaseRepository<
  Period,
  PeriodCreateInput,
  PeriodUpdateInput,
  PeriodWhereInput
> {
  constructor(prisma = db) {
    super("period", prisma);
  }

  async findByCode(code: string): Promise<Period | null> {
    return this.findUnique({ code } as PeriodWhereInput);
  }

  async findActive(): Promise<Period[]> {
    const model = this.prisma.period as unknown as {
      findMany: (args: { where: { isActive: boolean } }) => Promise<Period[]>;
    };
    return model.findMany({
      where: { isActive: true },
    });
  }

  async findByCourse(courseId: string): Promise<Period[]> {
    const model = this.prisma.period as unknown as {
      findMany: (args: { where: { courseId: string } }) => Promise<Period[]>;
    };
    return model.findMany({
      where: { courseId },
    });
  }
}

export const periodRepository = new PeriodRepository();
