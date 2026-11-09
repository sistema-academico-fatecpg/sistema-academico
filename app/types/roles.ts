export type Role = "ALUNO" | "PROFESSOR"

export const Permissions = {
    "r:grades": 0
}

export const roles: Record<Role, keyof Permissions[]> = {
    ALUNO: {Permissions["r:grades"]}
}
