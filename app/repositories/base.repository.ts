import { Prisma, PrismaClient } from "@prisma/client";
import { withTransaction } from "@/lib/transaction";

export type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export abstract class BaseRepository<T, CreateInput, UpdateInput, WhereInput> {
  protected readonly model: string;
  protected readonly prisma: PrismaClient;

  constructor(modelName: string, prisma: PrismaClient) {
    this.model = modelName;
    this.prisma = prisma;
  }

  async create(data: CreateInput): Promise<T> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      create: (args: { data: unknown }) => Promise<T>;
    };
    return model.create({ data });
  }

  async createMany(data: CreateInput[]): Promise<{ count: number }> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
    };
    return model.createMany({ data, skipDuplicates: true });
  }

  async findUnique(where: WhereInput): Promise<T | null> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      findUnique: (args: { where: unknown }) => Promise<T | null>;
    };
    return model.findUnique({ where });
  }

  async findFirst(where?: WhereInput): Promise<T | null> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      findFirst: (args: { where?: unknown }) => Promise<T | null>;
    };
    return model.findFirst({ where });
  }

  async findMany(args?: {
    where?: WhereInput;
    orderBy?: unknown;
    skip?: number;
    take?: number;
    include?: unknown;
  }): Promise<T[]> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      findMany: (args: unknown) => Promise<T[]>;
    };
    return model.findMany(args ?? {});
  }

  async count(where?: WhereInput): Promise<number> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      count: (args: { where?: unknown }) => Promise<number>;
    };
    return model.count({ where });
  }

  async update(where: WhereInput, data: UpdateInput): Promise<T> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      update: (args: { where: unknown; data: unknown }) => Promise<T>;
    };
    return model.update({ where, data });
  }

  async delete(where: WhereInput): Promise<T> {
    const model = this.prisma[this.model as keyof PrismaClient] as unknown as {
      delete: (args: { where: unknown }) => Promise<T>;
    };
    return model.delete({ where });
  }

  async executeTransaction<T>(
    callback: (tx: PrismaTx) => Promise<T>
  ): Promise<T> {
    return withTransaction(callback);
  }
}
