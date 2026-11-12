import { Prisma, User, Role, UserRole, RoleName } from "@prisma/client";
import { BaseRepository } from "@/repositories/base.repository";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

type UserCreateInput = Prisma.UserCreateInput;
type UserUpdateInput = Prisma.UserUpdateInput;
type UserWhereInput = Prisma.UserWhereInput;

type UserRoleCreateInput = Prisma.UserRoleCreateInput;
type UserRoleWhereInput = Prisma.UserRoleWhereInput;

export class UserRepository extends BaseRepository<User, UserCreateInput, UserUpdateInput, UserWhereInput> {
  constructor(prisma = db) {
    super("user", prisma);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findUnique({ email } as UserWhereInput);
  }

  async findByInstitutionalEmail(institutionalEmail: string): Promise<User | null> {
    return this.findUnique({ institutionalEmail } as UserWhereInput);
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<User | null> {
    return this.findUnique({ registrationNumber } as UserWhereInput);
  }

  async findUsersWithRoles(): Promise<(User & { userRoles: (UserRole & { role: Role })[] })[]> {
    const model = this.prisma.user as unknown as {
      findMany: (args: { include: { userRoles: { include: { role: boolean } } } }) => Promise<(User & { userRoles: (UserRole & { role: Role })[] })[]>;
    };
    return model.findMany({
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findByRole(roleName: RoleName): Promise<User[]> {
    const model = this.prisma.user as unknown as {
      findMany: (args: {
        where: {
          userRoles: {
            some: {
              role: {
                name: RoleName;
              };
            };
          };
        };
      }) => Promise<User[]>;
    };
    return model.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: roleName,
            },
          },
        },
      },
    });
  }

  async blockUser(userId: string, blockedBy: string | null): Promise<User> {
    return this.update(
      { id: userId } as UserWhereInput,
      {
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedBy,
      } as UserUpdateInput
    );
  }

  async activateUser(userId: string): Promise<User> {
    return this.update(
      { id: userId } as UserWhereInput,
      {
        status: "ACTIVE",
      } as UserUpdateInput
    );
  }

  async deactivateUser(userId: string, deactivatedBy: string | null): Promise<User> {
    return this.update(
      { id: userId } as UserWhereInput,
      {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        deactivatedBy,
      } as UserUpdateInput
    );
  }

  async assignRole(userId: string, roleName: RoleName): Promise<UserRole> {
    return this.executeTransaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { name: roleName },
      });

      if (!role) {
        throw new Error(`Role ${roleName} não encontrado`);
      }

      return tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });
    });
  }

  async removeRole(userId: string, roleName: RoleName): Promise<void> {
    await this.executeTransaction(async (tx) => {
      await tx.userRole.delete({
        where: {
          userId_roleName: {
            userId,
            roleName,
          },
        },
      });
    });
  }

  async getUserRoles(userId: string): Promise<RoleName[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.name as RoleName);
  }

  async hasRole(userId: string, roleName: RoleName): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        userId,
        role: { name: roleName },
      },
    });
    return count > 0;
  }

  async countByStatus(status: string): Promise<number> {
    return this.count({ status } as UserWhereInput);
  }

  async findPendingActivation(): Promise<User[]> {
    const model = this.prisma.user as unknown as {
      findMany: (args: { where: { status: string } }) => Promise<User[]>;
    };
    return model.findMany({
      where: { status: "PENDING_ACTIVATION" },
    });
  }
}

export const userRepository = new UserRepository();
