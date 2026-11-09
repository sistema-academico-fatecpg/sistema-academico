export enum Role {
  ALUNO,
  PROFESSOR,
}

export const Permissions = {
  "r:grades": 0,
};

export const Roles: Record<Role, string[]> = {
  [Role.ALUNO]: ["r:grades"],
  [Role.PROFESSOR]: [],
};
