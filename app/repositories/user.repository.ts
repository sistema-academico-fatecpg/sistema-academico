import type { Prisma } from "@/app/generated/prisma/client";
import { type DbExecutor, db } from "@/app/lib/db";
import type { RoleName } from "@/app/types/common";
import type { ListUsersQuery, UserInput } from "@/app/types/user";
import { withRepositoryErrors } from "./errors";

const userWithRoles = {
  roles: { include: { role: true } },
  studentProfile: true,
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRoles }>;

export class UserRepository {
  constructor(private readonly client: DbExecutor = db) {}

  findById(id: string) {
    return withRepositoryErrors(() =>
      this.client.user.findUnique({ where: { id }, include: userWithRoles }),
    );
  }

  findByEmail(email: string) {
    return withRepositoryErrors(() =>
      this.client.user.findUnique({
        where: { email: email.toLowerCase() },
        include: userWithRoles,
      }),
    );
  }

  async list(query: ListUsersQuery, visibleRoles: readonly RoleName[]) {
    const where: Prisma.UserWhereInput = {
      AND: [
        { roles: { some: { role: { name: { in: visibleRoles as RoleName[] } } } } },
        query.role ? { roles: { some: { role: { name: query.role } } } } : {},
        query.status ? { status: query.status } : {},
        query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
                { registrationNumber: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    return withRepositoryErrors(async () => {
      const [items, total] = await Promise.all([
        this.client.user.findMany({
          where,
          include: userWithRoles,
          orderBy: { name: "asc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.client.user.count({ where }),
      ]);
      return { items, total, page: query.page, pageSize: query.pageSize };
    });
  }

  async create(input: UserInput & { createdBy?: string | null }) {
    return withRepositoryErrors(() =>
      this.client.$transaction(async (tx) => {
        const role = await tx.role.findUniqueOrThrow({ where: { name: input.role } });
        const user = await tx.user.create({
          data: {
            name: input.name,
            socialName: input.socialName ?? null,
            email: input.email,
            personalEmail: input.personalEmail ?? null,
            registrationNumber: input.registrationNumber ?? null,
            status: "PENDING_ACTIVATION",
            roles: { create: { roleId: role.id, assignedBy: input.createdBy ?? null } },
          },
          include: userWithRoles,
        });
        return user;
      }),
    );
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return withRepositoryErrors(() =>
      this.client.user.update({ where: { id }, data, include: userWithRoles }),
    );
  }

  block(id: string, blockedBy: string, reason: string) {
    return withRepositoryErrors(() =>
      this.client.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: {
            status: "BLOCKED",
            blockedAt: new Date(),
            blockedBy,
            blockReason: reason,
          },
        });
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.token.updateMany({
          where: { userId: id, usedAt: null },
          data: { usedAt: new Date() },
        });
        return user;
      }),
    );
  }

  deactivate(id: string, deactivatedBy: string) {
    return withRepositoryErrors(() =>
      this.client.user.update({
        where: { id },
        data: {
          status: "INACTIVE",
          deactivatedAt: new Date(),
          deactivatedBy,
        },
      }),
    );
  }

  registerFailedLogin(id: string, maxAttempts: number, lockMinutes: number) {
    return withRepositoryErrors(() =>
      this.client.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id } });
        const attempts = user.failedLoginAttempts + 1;
        const shouldLock = attempts >= maxAttempts;
        return tx.user.update({
          where: { id },
          data: {
            failedLoginAttempts: shouldLock ? 0 : attempts,
            lockedUntil: shouldLock
              ? new Date(Date.now() + lockMinutes * 60_000)
              : user.lockedUntil,
          },
        });
      }),
    );
  }

  registerSuccessfulLogin(id: string) {
    return withRepositoryErrors(() =>
      this.client.user.update({
        where: { id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      }),
    );
  }

  countActiveMasters() {
    return withRepositoryErrors(() =>
      this.client.user.count({
        where: {
          status: "ACTIVE",
          roles: { some: { role: { name: "ADMIN_MASTER" } } },
        },
      }),
    );
  }

  listExpiredEmergencyAccounts(now = new Date()) {
    return withRepositoryErrors(() =>
      this.client.user.findMany({
        where: { isEmergency: true, emergencyExpiresAt: { lte: now }, status: "ACTIVE" },
      }),
    );
  }

  revokeSessions(userId: string) {
    return withRepositoryErrors(() => this.client.session.deleteMany({ where: { userId } }));
  }
}
