import type { RoleName } from "@/app/types/common";

/** Rótulos legíveis dos perfis institucionais. */
export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN_MASTER: "Administrador master",
  ADMIN_SECUNDARIO: "Administrador",
  PROFESSOR: "Professor",
  ALUNO: "Aluno",
  AUDITOR: "Auditor",
  SUPORTE_TECNICO: "Suporte técnico",
};

export function roleLabel(roles: readonly RoleName[]): string {
  return roles.map((role) => ROLE_LABELS[role] ?? role).join(" · ");
}
