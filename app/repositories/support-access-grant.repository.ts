import { type DbExecutor, db } from "@/app/lib/db";
import type { SystemModule } from "@/app/types/common";
import { withRepositoryErrors } from "./errors";

export class SupportAccessGrantRepository {
  constructor(private readonly client: DbExecutor = db) {}

  create(input: {
    requestedBy: string;
    reason: string;
    startsAt: Date;
    endsAt: Date;
    modules: SystemModule[];
  }) {
    return withRepositoryErrors(() =>
      this.client.supportAccessGrant.create({
        data: {
          requestedBy: input.requestedBy,
          reason: input.reason,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          modules: {
            create: input.modules.map((module) => ({ module, canRead: true })),
          },
        },
        include: { modules: true },
      }),
    );
  }

  findById(id: string) {
    return withRepositoryErrors(() =>
      this.client.supportAccessGrant.findUnique({
        where: { id },
        include: { modules: true, requester: true, approver: true },
      }),
    );
  }

  list(filter?: { status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "REVOKED" }) {
    return withRepositoryErrors(() =>
      this.client.supportAccessGrant.findMany({
        where: filter?.status ? { status: filter.status } : {},
        include: { modules: true, requester: true, approver: true },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  decide(id: string, status: "APPROVED" | "REJECTED", approvedBy: string) {
    return withRepositoryErrors(() =>
      this.client.supportAccessGrant.update({
        where: { id },
        data: { status, approvedBy, decidedAt: new Date() },
        include: { modules: true },
      }),
    );
  }

  revoke(id: string) {
    return withRepositoryErrors(() =>
      this.client.supportAccessGrant.update({ where: { id }, data: { status: "REVOKED" } }),
    );
  }

  expireDue(now = new Date()) {
    return withRepositoryErrors(() =>
      this.client.supportAccessGrant.updateMany({
        where: { status: "APPROVED", endsAt: { lte: now } },
        data: { status: "EXPIRED" },
      }),
    );
  }

  findActiveForUser(userId: string, now = new Date()) {
    return withRepositoryErrors(() =>
      this.client.supportAccessGrant.findFirst({
        where: {
          requestedBy: userId,
          status: "APPROVED",
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
        include: { modules: true },
        orderBy: { endsAt: "desc" },
      }),
    );
  }
}
