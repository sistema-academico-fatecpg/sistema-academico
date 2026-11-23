import { SENSITIVE_FIELD_PATTERN } from "@/app/types/log";

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

/**
 * Remove recursivamente senhas, tokens, códigos e segredos de objetos que
 * serão gravados em log (Política de Segurança, seção 10.5).
 */
export function redactSensitiveData(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return "[TRUNCATED]";

  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      result[key] = REDACTED;
      continue;
    }
    result[key] = redactSensitiveData(item, depth + 1);
  }
  return result;
}

export function redactText(value: string): string {
  if (!SENSITIVE_FIELD_PATTERN.test(value)) return value;
  return REDACTED;
}
