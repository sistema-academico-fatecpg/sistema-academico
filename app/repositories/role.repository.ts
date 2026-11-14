import type { Permission, Prisma, Role, RoleName } from "@prisma/client";
import { db } from "@/lib/db";
import { BaseRepository } from "@/repositories/base.repository";

type RoleCreateInput = Prisma.RoleCreateInput;
type RoleUpdateInput = Prisma.RoleUpdateInput;
type RoleWhereInput = Prisma.RoleWhereInput;

export class RoleRepository extends BaseRepository<
  Role,
  RoleCreateInput,
  RoleUpdateInput,
  RoleWhereInput
> {
  constructor(prisma = db) {
    super("role", prisma);
  }

  async findByName(name: RoleName): Promise<Role | null> {
    return this.findUnique({ name } as RoleWhereInput);
  }

  async findAllWithPermissions(): Promise<
    (Role & { permissions: (Permission & { permission: Permission })[] })[]
  > {
    const model = this.prisma.role as unknown as {
      findMany: (args: {
        include: { permissions: { include: { permission: boolean } } };
      }) => Promise<(Role & { permissions: (Permission & { permission: Permission })[] })[]>;
    };
    return model.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async getPermissions(roleName: RoleName): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) return [];
    return role.permissions.map((rp) => rp.permission.name);
  }

  async assignPermission(roleName: RoleName, permissionName: string): Promise<void> {
    await this.executeTransaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { name: roleName } });
      const permission = await tx.permission.findUnique({ where: { name: permissionName } });

      if (!role || !permission) {
        throw new Error("Role ou permissão não encontrada");
      }

      await tx.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    });
  }

  async removePermission(roleName: RoleName, permissionName: string): Promise<void> {
    await this.executeTransaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { name: roleName } });
      const permission = await tx.permission.findUnique({ where: { name: permissionName } });

      if (!role || !permission) {
        throw new Error("Role ou permissão não encontrada");
      }

      await tx.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
      });
    });
  }

  async hasPermission(roleName: RoleName, permissionName: string): Promise<boolean> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) return false;
    return role.permissions.some((rp) => rp.permission.name === permissionName);
  }
}

export const roleRepository = new RoleRepository();
