import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import type { AlertType, SystemModule } from "@/app/types/common";
import type { AlertFilter, LogFilter, LogInput } from "@/app/types/log";
import { withRepositoryErrors } from "./errors";

function json(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class LogRepository {
  constructor(private readonly client: DbExecutor = db) {}

  /**
   * Apenas inclusão. O repositório não expõe update/delete: a imutabilidade é
   * reforçada por trigger no banco (ver migração).
   */
  append(input: LogInput) {
    return withRepositoryErrors(() =>
      this.client.log.create({
        data: {
          userId: input.userId ?? null,
          role: input.role ?? null,
          ipAddress: input.ipAddress,
          action: input.action,
          module: input.module as SystemModule,
          recordType: input.recordType ?? null,
          recordId: input.recordId ?? null,
          oldValue: json(input.oldValue),
          newValue: json(input.newValue),
          result: input.result,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        },
      }),
    );
  }

  findMany(filter: LogFilter) {
    const where: Prisma.LogWhereInput = {
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.module ? { module: filter.module } : {}),
      ...(filter.result ? { result: filter.result } : {}),
      ...(filter.action ? { action: { contains: filter.action, mode: "insensitive" } } : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: new Date(filter.from) } : {}),
              ...(filter.to ? { lte: new Date(filter.to) } : {}),
            },
          }
        : {}),
    };

    return withRepositoryErrors(async () => {
      const [items, total] = await Promise.all([
        this.client.log.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
          include: { user: { select: { name: true, email: true } } },
        }),
        this.client.log.count({ where }),
      ]);
      return { items, total, page: filter.page, pageSize: filter.pageSize };
    });
  }

  async createAlert(type: AlertType, message: string, metadata?: unknown, logId?: string) {
    return withRepositoryErrors(() =>
      this.client.auditAlert.create({
        data: { type, message, metadata: json(metadata), logId: logId ?? null },
      }),
    );
  }

  countRecentFailures(userId: string, since: Date) {
    return withRepositoryErrors(() =>
      this.client.log.count({
        where: {
          userId,
          action: "LOGIN_FAILED",
          result: "FAILURE",
          createdAt: { gte: since },
        },
      }),
    );
  }

  listAlerts(filter: AlertFilter) {
    const where: Prisma.AuditAlertWhereInput = {
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.acknowledged === "true" ? { acknowledgedAt: { not: null } } : {}),
      ...(filter.acknowledged === "false" ? { acknowledgedAt: null } : {}),
    };

    return withRepositoryErrors(async () => {
      const [items, total] = await Promise.all([
        this.client.auditAlert.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
        this.client.auditAlert.count({ where }),
      ]);
      return { items, total, page: filter.page, pageSize: filter.pageSize };
    });
  }

  acknowledgeAlert(id: string) {
    return withRepositoryErrors(() =>
      this.client.auditAlert.update({
        where: { id },
        data: { acknowledgedAt: new Date() },
      }),
    );
  }
}
