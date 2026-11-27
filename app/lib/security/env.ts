/**
 * Validação de configuração sensível (7.4, 11.2.1, 11.2.3, 11.2.4, 11.3.2,
 * 11.3.3, 11.3.4, 12.1, 12.4).
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

export const KEY_ROTATION_DAYS = 365;
export const BACKUP_MEDIA_MAX_YEARS = 3;
export const RESTORE_TEST_DAYS = 30;
/** 11.3.5: metas contratuais; o RTO medido vem do teste de restauração real. */
export const RPO_TARGET_HOURS = 24;
export const RTO_TARGET_HOURS = 8;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não configurada`);
  return value;
}

function requireDistinct(name: string, other: string): string {
  const value = requireEnv(name);
  if (value === process.env[other]?.trim()) {
    throw new Error(`${name} deve ser distinto de ${other} (ambientes separados, 12.1)`);
  }
  return value;
}

/** 11.2.4: rotação anual da chave e dois custodiantes nominais. */
export function keyRotationStatus(now = new Date()) {
  const rotatedAtRaw = process.env.DATA_ENCRYPTION_KEY_ROTATED_AT?.trim();
  const rotatedAt =
    rotatedAtRaw && !Number.isNaN(Date.parse(rotatedAtRaw)) ? new Date(rotatedAtRaw) : null;
  const daysSinceRotation = rotatedAt
    ? Math.floor((now.getTime() - rotatedAt.getTime()) / 86_400_000)
    : null;
  const custodians = [
    process.env.KEY_CUSTODIAN_1?.trim(),
    process.env.KEY_CUSTODIAN_2?.trim(),
  ].filter((value): value is string => Boolean(value));
  return {
    rotatedAt: rotatedAt?.toISOString() ?? null,
    daysSinceRotation,
    maxDays: KEY_ROTATION_DAYS,
    overdue: daysSinceRotation === null || daysSinceRotation > KEY_ROTATION_DAYS,
    custodianCount: custodians.length,
    custodiansValid: custodians.length === 2 && custodians[0] !== custodians[1],
  };
}

/** 11.3.3: nuvem exclusiva, MFA, imutabilidade e transferência internacional. */
export function backupCloudStatus() {
  const region = process.env.BACKUP_CLOUD_REGION?.trim() ?? "";
  const international = Boolean(region) && !/^br/i.test(region);
  return {
    region,
    mfa: process.env.BACKUP_CLOUD_MFA?.trim().toLowerCase() === "true",
    immutable: process.env.BACKUP_CLOUD_IMMUTABLE?.trim().toLowerCase() === "true",
    international,
    transferAuthorization: process.env.INTERNATIONAL_TRANSFER_AUTHORIZATION?.trim() ?? null,
  };
}

export function assertProductionSecrets(): void {
  if (!isProduction()) return;

  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32 || PLACEHOLDERS.has(secret.toLowerCase())) {
    throw new Error("BETTER_AUTH_SECRET ausente ou fraca em produção");
  }

  requireEnv("DATABASE_URL");
  requireDistinct("AUDIT_DATABASE_URL", "DATABASE_URL");
  requireDistinct("BACKUP_TEST_DATABASE_URL", "DATABASE_URL");

  // 11.2.1: HTTPS obrigatório e TLS >= 1.2.
  const baseUrl = requireEnv("BETTER_AUTH_URL");
  if (!/^https:\/\//i.test(baseUrl)) {
    throw new Error("BETTER_AUTH_URL deve usar HTTPS em produção (11.2.1)");
  }
  const tls = process.env.TLS_MIN_VERSION?.trim();
  if (tls !== "1.2" && tls !== "1.3") {
    throw new Error("TLS_MIN_VERSION deve ser 1.2 ou 1.3 (11.2.1)");
  }

  const key = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "DATA_ENCRYPTION_KEY ausente ou inválida: exigem-se 32 bytes hexadecimais do cofre (11.2.3)",
    );
  }
  const rotation = keyRotationStatus();
  if (rotation.overdue) {
    throw new Error("DATA_ENCRYPTION_KEY_ROTATED_AT ausente ou rotação anual vencida (11.2.4)");
  }
  if (!rotation.custodiansValid) {
    throw new Error(
      "KEY_CUSTODIAN_1 e KEY_CUSTODIAN_2 devem ser duas pessoas nominais distintas (11.2.4)",
    );
  }

  const maintenance = process.env.MAINTENANCE_SECRET?.trim();
  if (!maintenance || maintenance.length < 16) {
    throw new Error("MAINTENANCE_SECRET ausente ou fraca em produção");
  }

  // 11.3.1/11.3.2: mídias de backup configuradas.
  requireEnv("BACKUP_LOCAL_DIR");
  requireEnv("BACKUP_CLOUD_DIR");

  // 11.3.3: nuvem com MFA, imutabilidade e regra de transferência.
  const cloud = backupCloudStatus();
  if (!cloud.region || !cloud.mfa || !cloud.immutable) {
    throw new Error(
      "BACKUP_CLOUD_REGION, BACKUP_CLOUD_MFA=true e BACKUP_CLOUD_IMMUTABLE=true são obrigatórios (11.3.3)",
    );
  }
  if (cloud.international && !cloud.transferAuthorization) {
    throw new Error(
      "Dados fora do Brasil exigem INTERNATIONAL_TRANSFER_AUTHORIZATION (LGPD art. 33 / 11.3.3)",
    );
  }

  // 12.1/7.4: ambientes separados, sem acesso de desenvolvimento à produção.
  const appEnv = requireEnv("APP_ENV");
  if (appEnv !== "production") {
    throw new Error("APP_ENV deve ser 'production' neste ambiente (12.1)");
  }
  // 12.1/7.4: a variável é obrigatória e só aceita "false" — ausência não vale.
  const devAccess = process.env.DEV_TEAM_PRODUCTION_ACCESS?.trim().toLowerCase();
  if (devAccess !== "false") {
    throw new Error(
      "DEV_TEAM_PRODUCTION_ACCESS=false é obrigatório: equipe de Desenvolvimento não pode ter acesso à produção (7.4/12.1)",
    );
  }
}
