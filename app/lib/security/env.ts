/**
 * Validação de configuração sensível (seção 12.4).
 *
 * Nenhum segredo é aceito com valor de exemplo em produção. O objetivo é
 * falhar cedo e impedir que uma instalação produtiva suba com configuração
 * insegura.
 */

const PLACEHOLDERS = new Set([
  "replace-with-a-secure-secret",
  "changeme",
  "change-me",
  "secret",
  "development",
]);

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function assertProductionSecrets(): void {
  if (!isProduction()) return;

  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32 || PLACEHOLDERS.has(secret.toLowerCase())) {
    throw new Error("BETTER_AUTH_SECRET ausente ou fraca em produção");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada");
  }

  const key = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "DATA_ENCRYPTION_KEY ausente ou inválida: exigem-se 32 bytes hexadecimais do cofre de chaves (11.2.3)",
    );
  }

  const maintenance = process.env.MAINTENANCE_SECRET?.trim();
  if (!maintenance || maintenance.length < 16) {
    throw new Error("MAINTENANCE_SECRET ausente ou fraca em produção");
  }

  if (!process.env.AUDIT_DATABASE_URL) {
    throw new Error("AUDIT_DATABASE_URL não configurada: base de logs deve ser separada (10.3)");
  }
}
