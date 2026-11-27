import { randomBytes } from "node:crypto";
import { DEFAULT_INSTITUTIONAL_EMAIL_DOMAIN } from "@/app/types/common";

/** Domínios institucionais por cargo (8.4.1). */
const ROLE_EMAIL_DOMAINS: Record<string, string> = {
  ALUNO: "aluno.academico.com",
  PROFESSOR: "prof.academico.com",
  ADMIN_MASTER: "coord.academico.com",
  ADMIN_SECUNDARIO: "admin.academico.com",
  AUDITOR: "auditor.academico.com",
  SUPORTE_TECNICO: "suporte.academico.com",
};

/**
 * E-mail institucional: `nome<matrícula>@<domínio do cargo>`. É um dado gerado
 * pelo sistema, nunca informado por quem cadastra. O banco também gera o valor
 * em `user_roles.institutional_email` no INSERT; esta função mantém
 * `users.email` (usado no login) sincronizado com o mesmo formato.
 */
export function institutionalEmailDomain(): string {
  return (
    process.env.INSTITUTIONAL_EMAIL_DOMAIN?.trim().toLowerCase() ||
    DEFAULT_INSTITUTIONAL_EMAIL_DOMAIN
  );
}

export function roleEmailDomain(roleName: string): string {
  return ROLE_EMAIL_DOMAINS[roleName] ?? institutionalEmailDomain();
}

export function slugifyName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40)
    .replace(/\.+$/g, "");
  return slug || "usuario";
}

export function generateInstitutionalEmail(
  name: string,
  registrationNumber: string | null | undefined,
  roleName: string,
): string {
  const digits = registrationNumber?.replace(/\D/g, "") || randomBytes(3).toString("hex");
  return `${slugifyName(name)}${digits}@${roleEmailDomain(roleName)}`;
}
