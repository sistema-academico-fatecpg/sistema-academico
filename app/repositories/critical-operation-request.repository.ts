import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import type { ApprovalStatus } from "@/app/types/common";
import type { CriticalOperationRequestInput } from "@/app/types/critical-operation";
import { withRepositoryErrors } from "./errors";

export class CriticalOperationRequestRepository {
  constructor(private readonly client: DbExecutor = db) {}

  create(requestedBy: string, input: CriticalOperationRequestInput) {
    return withRepositoryErrors(() =>
      this.client.criticalOperationRequest.create({
        data: {
          requestedBy,
          operation: input.operation,
          module: input.module ?? null,
          recordType: input.recordType ?? null,
          recordId: input.recordId ?? null,
          reason: input.reason,
          payload: input.payload
            ? (JSON.parse(JSON.stringify(input.payload)) as Prisma.InputJsonValue)
            : undefined,
          authorizationDocument: input.authorizationDocument ?? null,
        },
      }),
    );
  }

  findById(id: string) {
    return withRepositoryErrors(() =>
      this.client.criticalOperationRequest.findUnique({
        where: { id },
        include: { requester: true, approver: true },
      }),
    );
  }

  findPendingIncludingOwn(_userId: string) {
    return withRepositoryErrors(() =>
      this.client.criticalOperationRequest.findMany({
        where: { status: "PENDING" },
        include: { requester: true, approver: true },
        orderBy: { requestedAt: "asc" },
      }),
    );
  }

  list(filter: { status?: ApprovalStatus; page: number; pageSize: number }) {
    const where: Prisma.CriticalOperationRequestWhereInput = filter.status
      ? { status: filter.status }
      : {};
    return withRepositoryErrors(async () => {
      const [items, total] = await Promise.all([
        this.client.criticalOperationRequest.findMany({
          where,
          include: { requester: true, approver: true },
          orderBy: { requestedAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
        this.client.criticalOperationRequest.count({ where }),
      ]);
      return { items, total, page: filter.page, pageSize: filter.pageSize };
    });
  }

  decide(
    id: string,
    status: Exclude<ApprovalStatus, "PENDING">,
    approvedBy: string | null,
    reason?: string,
  ) {
    return withRepositoryErrors(() =>
      this.client.criticalOperationRequest.update({
        where: { id },
        data: {
          status,
          approvedBy,
          decisionReason: reason ?? null,
          decidedAt: new Date(),
          executedAt: status === "EXECUTED" ? new Date() : null,
        },
      }),
    );
  }

  countPending() {
    return withRepositoryErrors(() =>
      this.client.criticalOperationRequest.count({ where: { status: "PENDING" } }),
    );
  }
}
