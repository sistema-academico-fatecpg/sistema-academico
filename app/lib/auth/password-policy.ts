import type { RoleName } from "@/app/types/common";
import { requiresMfa } from "@/app/types/roles";
import { COMMON_PASSWORDS } from "./common-passwords";

export type PasswordValidationInput = {
  password: string;
  name?: string;
  registrationNumber?: string | null;
  roles?: readonly RoleName[];
};

export type PasswordValidationResult = { valid: true } | { valid: false; reasons: string[] };

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Regras da seção 8.3:
 * - 12 caracteres para perfis com segundo fator, 15 para alunos sem 2FA;
 * - maiúscula, minúscula, número e caractere especial;
 * - recusa de senhas comuns/vazadas e que contenham nome ou matrícula;
 * - sem troca periódica obrigatória (não há expiração de senha no sistema).
 */
export function validatePassword(input: PasswordValidationInput): PasswordValidationResult {
  const reasons: string[] = [];
  const password = input.password;
  const mfaProfile = requiresMfa(input.roles ?? []);
  const minimum = mfaProfile ? 12 : 15;

  if (password.length < minimum) {
    reasons.push(`A senha deve ter no mínimo ${minimum} caracteres.`);
  }
  if (!/[A-Z]/.test(password)) {
    reasons.push("A senha deve conter letra maiúscula.");
  }
  if (!/[a-z]/.test(password)) {
    reasons.push("A senha deve conter letra minúscula.");
  }
  if (!/[0-9]/.test(password)) {
    reasons.push("A senha deve conter número.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    reasons.push("A senha deve conter caractere especial.");
  }

  const normalized = normalize(password);
  if (COMMON_PASSWORDS.has(normalized)) {
    reasons.push("A senha está na lista de senhas comuns ou vazadas.");
  }

  if (input.name && input.name.trim().length >= 3) {
    const normalizedName = normalize(input.name);
    if (normalizedName.split(/\s+/).some((part) => part.length >= 3 && normalized.includes(part))) {
      reasons.push("A senha não pode conter o nome do usuário.");
    }
  }

  if (input.registrationNumber && input.registrationNumber.trim().length >= 3) {
    if (normalized.includes(normalize(input.registrationNumber))) {
      reasons.push("A senha não pode conter a matrícula do usuário.");
    }
  }

  return reasons.length === 0 ? { valid: true } : { valid: false, reasons };
}

export function passwordMinimumLength(roles: readonly RoleName[]): number {
  return requiresMfa(roles) ? 12 : 15;
}
