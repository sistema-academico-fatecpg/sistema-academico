import { z } from "zod";

export enum Role {
  ALUNO = 1,
  PROFESSOR = 2,
}

export enum Permissions {
  READ_GRADES,
  WRITE_GRADES,
}

export const RoleSchema = z.nativeEnum(Role);
export type RoleType = z.infer<typeof RoleSchema>;

export const PermissionSchema = z.nativeEnum(Permissions);
export type PermissionType = z.infer<typeof PermissionSchema>;

export const Roles: Record<Role, Record<Permissions, boolean>> = {
  [Role.ALUNO]: { [Permissions.READ_GRADES]: true, [Permissions.WRITE_GRADES]: false },
  [Role.PROFESSOR]: { [Permissions.READ_GRADES]: true, [Permissions.WRITE_GRADES]: true },
};
