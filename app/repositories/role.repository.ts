import { Prisma, Role, RoleName, Permission } from "@prisma/client";
import { BaseRepository } from "@/repositories/base.repository";
import { db } from "@/lib/db";

type RoleCreateInput = Prisma.RoleCreateInput;
type RoleUpdateInput = Prisma.RoleUpdateInput;
type RoleWhereInput = Prisma.RoleWhereInput;

export class RoleRepository extends BaseRepository<Role, RoleCreateInput, RoleUpdateInput, RoleWhereInput> {
  constructor(prisma = db) {
    super("role", prisma);
  }

  async findByName(name: RoleName): Promise<Role | null> {
    return this.findUnique({ name } as RoleWhereInput);
  }

  async findAllWithPermissions(): Promise<(Role & { permissions: (Permission & { permission: Permission })[] })[]> {
    const model = this.prisma.role as unknown as {
      findMany: (args: { include: { permissions: { include: { permission: boolean } } } }) => Promise<(Role & { permissions: (Permission & { permission: Permission })[] })[]>;
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
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleName },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission.name);
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
      await tx.rolePermission.delete({
        where: {
          roleName_permissionName: {
            roleName,
            permissionName,
          },
        },
      });
    });
  }

  async hasPermission(roleName: RoleName, permissionName: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: {
        roleName,
        permissionName,
      },
    });
    return count > 0;
  }
}

export const roleRepository = new RoleRepository();
