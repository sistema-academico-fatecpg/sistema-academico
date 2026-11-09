export enum Role {
  ALUNO,
  PROFESSOR,
}

export enum Permissions {
  READ_GRADES,
  WRITE_GRADES,
}

export const Roles: Record<Role, Record<Permissions, boolean>> = {
  [Role.ALUNO]: { [Permissions.READ_GRADES]: true, [Permissions.WRITE_GRADES]: false },
  [Role.PROFESSOR]: { [Permissions.READ_GRADES]: true, [Permissions.WRITE_GRADES]: true },
};
