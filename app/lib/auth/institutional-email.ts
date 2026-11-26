import { randomBytes } from "node:crypto";
import { DEFAULT_INSTITUTIONAL_EMAIL_DOMAIN } from "@/app/types/common";

/**
 * E-mail institucional é um dado gerado pelo sistema, nunca informado por quem
 * cadastra: `nomecodigo@dominio`. O e-mail pessoal é o endereço real do titular
 * e recebe o link de ativação.
 */
export function institutionalEmailDomain(): string {
  return (
    process.env.INSTITUTIONAL_EMAIL_DOMAIN?.trim().toLowerCase() ||
    DEFAULT_INSTITUTIONAL_EMAIL_DOMAIN
  );
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

/** Código aleatório de 6 caracteres hexadecimais, único por conta. */
function uniqueCode(): string {
  return randomBytes(3).toString("hex");
}

export async function generateInstitutionalEmail(
  name: string,
  exists: (email: string) => Promise<boolean> | boolean,
): Promise<string> {
  const slug = slugifyName(name);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const email = `${slug}${uniqueCode()}@${institutionalEmailDomain()}`;
    if (!(await exists(email))) return email;
  }
  throw new Error("Não foi possível gerar um e-mail institucional único");
}
