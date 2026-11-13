import { type DbExecutor, db } from "@/app/lib/db";
import type { PermissionAction, RoleName, SystemModule } from "@/app/types/common";
import { withRepositoryErrors } from "./errors";

export class RoleRepository {
  constructor(private readonly client: DbExecutor = db) {}

  listAll() {
    return withRepositoryErrors(() =>
      this.client.role.findMany({
        orderBy: { name: "asc" },
        include: { permissions: { include: { permission: true } } },
      }),
    );
  }

  findByName(name: RoleName) {
    return withRepositoryErrors(() =>
      this.client.role.findUnique({
        where: { name },
        include: { permissions: { include: { permission: true } } },
      }),
    );
  }

  findUserRoles(userId: string) {
    return withRepositoryErrors(() =>
      this.client.userRole.findMany({ where: { userId }, include: { role: true } }),
    );
  }

  assignRole(userId: string, roleId: string, assignedBy?: string | null) {
    return withRepositoryErrors(() =>
      this.client.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: {},
        create: { userId, roleId, assignedBy: assignedBy ?? null },
      }),
    );
  }

  removeRole(userId: string, roleId: string) {
    return withRepositoryErrors(() =>
      this.client.userRole.delete({ where: { userId_roleId: { userId, roleId } } }),
    );
  }

  upsertPermission(module: SystemModule, action: PermissionAction, description?: string) {
    const name = `${module}:${action}`;
    return withRepositoryErrors(() =>
      this.client.permission.upsert({
        where: { name },
        update: { description },
        create: { module, action, name, description },
      }),
    );
  }

  setRolePermissions(roleId: string, permissionIds: string[]) {
    return withRepositoryErrors(() =>
      this.client.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
          });
        }
      }),
    );
  }
}
