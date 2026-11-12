import { Prisma, CriticalOperationRequest, ApprovalStatus } from "@prisma/client";
import { BaseRepository } from "@/repositories/base.repository";
import { db } from "@/lib/db";

type CriticalOperationRequestCreateInput = Prisma.CriticalOperationRequestCreateInput;
type CriticalOperationRequestUpdateInput = Prisma.CriticalOperationRequestUpdateInput;
type CriticalOperationRequestWhereInput = Prisma.CriticalOperationRequestWhereInput;

export class CriticalOperationRequestRepository extends BaseRepository<
  CriticalOperationRequest,
  CriticalOperationRequestCreateInput,
  CriticalOperationRequestUpdateInput,
  CriticalOperationRequestWhereInput
> {
  constructor(prisma = db) {
    super("criticalOperationRequest", prisma);
  }

  async findByStatus(status: ApprovalStatus): Promise<CriticalOperationRequest[]> {
    return this.findMany({
      where: { status } as CriticalOperationRequestWhereInput,
      orderBy: { requestedAt: "desc" },
    });
  }

  async findByRequester(userId: string): Promise<CriticalOperationRequest[]> {
    return this.findMany({
      where: { requestedBy: userId } as CriticalOperationRequestWhereInput,
      orderBy: { requestedAt: "desc" },
    });
  }

  async findPending(): Promise<CriticalOperationRequest[]> {
    return this.findByStatus("PENDING");
  }

  async approve(requestId: string, approverId: string): Promise<CriticalOperationRequest> {
    return this.update(
      { id: requestId } as CriticalOperationRequestWhereInput,
      {
        status: "APPROVED",
        approvedBy: approverId,
        decidedAt: new Date(),
      } as CriticalOperationRequestUpdateInput
    );
  }

  async reject(requestId: string, approverId: string): Promise<CriticalOperationRequest> {
    return this.update(
      { id: requestId } as CriticalOperationRequestWhereInput,
      {
        status: "REJECTED",
        approvedBy: approverId,
        decidedAt: new Date(),
      } as CriticalOperationRequestUpdateInput
    );
  }

  async execute(requestId: string): Promise<CriticalOperationRequest> {
    return this.update(
      { id: requestId } as CriticalOperationRequestWhereInput,
      {
        status: "EXECUTED",
        executedAt: new Date(),
      } as CriticalOperationRequestUpdateInput
    );
  }

  async cancel(requestId: string): Promise<CriticalOperationRequest> {
    return this.update(
      { id: requestId } as CriticalOperationRequestWhereInput,
      {
        status: "CANCELLED",
      } as CriticalOperationRequestUpdateInput
    );
  }
}

export const criticalOperationRequestRepository = new CriticalOperationRequestRepository();
