import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { conflict } from "@/app/lib/auth/errors";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { RoleRepository } from "@/app/repositories/role.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { RoleAssignmentSchema } from "@/app/types/user";

const CreateRoleSchema = z.object({
  name: RoleAssignmentSchema,
  description: z.string().trim().max(255).optional(),
});

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

/** 7.2: todo perfil novo nasce sem nenhuma permissão. */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.ROLES_CREATE);
    const input = CreateRoleSchema.parse(await request.json());
    const repository = new RoleRepository();
    if (await repository.findByName(input.name)) {
      throw conflict("Perfil já existe");
    }
    const role = await repository.createEmpty(input.name, input.description);
    await createAuditService().record({
      userId: actor.id as never,
      role: actor.roles[0] ?? null,
      ipAddress: getClientIp(request),
      action: AUDIT_ACTIONS.ROLE_CREATED,
      module: "ROLES",
      recordType: "Role",
      recordId: role.id,
      result: "SUCCESS",
      newValue: { name: role.name, permissions: [] },
    });
    return Response.json(
      { id: role.id, name: role.name, description: role.description, permissions: [] },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
