import type { Log, OperationResult, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logInfo } from "@/lib/logger";
import { BaseRepository } from "@/repositories/base.repository";

type LogCreateInput = Prisma.LogCreateInput;
type LogWhereInput = Prisma.LogWhereInput;

export class LogRepository extends BaseRepository<Log, LogCreateInput, never, LogWhereInput> {
  constructor(prisma = db) {
    super("log", prisma);
  }

  async createLog(args: {
    userId?: string | null;
    role?: string | null;
    ipAddress: string;
    action: string;
    module: string;
    recordType?: string | null;
    recordId?: string | null;
    oldValue?: unknown | null;
    newValue?: unknown | null;
    result: OperationResult;
  }): Promise<Log> {
    const log = await this.create({
      user: args.userId ? { connect: { id: args.userId } } : undefined,
      role: (args.role ?? null) as any,
      ipAddress: args.ipAddress,
      action: args.action,
      module: args.module as any,
      recordType: args.recordType ?? null,
      recordId: args.recordId ?? null,
      oldValue: (args.oldValue ?? null) as any,
      newValue: (args.newValue ?? null) as any,
      result: args.result,
    });

    logInfo("Log criado", {
      logId: log.id,
      action: log.action,
      module: log.module,
      userId: log.userId,
      result: log.result,
    });

    return log;
  }

  async findByUser(userId: string): Promise<Log[]> {
    return this.findMany({
      where: { userId } as LogWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async findByModule(module: string): Promise<Log[]> {
    return this.findMany({
      where: { module } as LogWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async findByAction(action: string): Promise<Log[]> {
    return this.findMany({
      where: { action } as LogWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async findByResult(result: OperationResult): Promise<Log[]> {
    return this.findMany({
      where: { result } as LogWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Log[]> {
    const model = this.prisma.log as unknown as {
      findMany: (args: {
        where: {
          createdAt: {
            gte: Date;
            lte: Date;
          };
        };
        orderBy?: unknown;
      }) => Promise<Log[]>;
    };
    return model.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIpAddress(ipAddress: string): Promise<Log[]> {
    return this.findMany({
      where: { ipAddress } as LogWhereInput,
      orderBy: { createdAt: "desc" },
    });
  }

  async countByResult(result: OperationResult): Promise<number> {
    return this.count({ result } as LogWhereInput);
  }

  async countByModule(module: string): Promise<number> {
    return this.count({ module } as LogWhereInput);
  }
}

export const logRepository = new LogRepository();
