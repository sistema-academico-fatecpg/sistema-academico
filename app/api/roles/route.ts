import { jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { RoleRepository } from "@/app/repositories/role.repository";
import { PERMISSIONS } from "@/app/types/roles";

export async function GET(_request: Request) {
  try {
    await requirePermission(PERMISSIONS.ROLES_READ);
    const roles = await new RoleRepository().listAll();
    return Response.json({
      items: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions
          .map((item) => item.permission.name)
          .sort((a, b) => a.localeCompare(b)),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
