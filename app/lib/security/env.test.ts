import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertProductionSecrets,
  backupCloudStatus,
  KEY_ROTATION_DAYS,
  keyRotationStatus,
} from "./env";

const ORIGINAL = { ...process.env };
const TODAY = new Date().toISOString().slice(0, 10);

const VALID_PROD = {
  NODE_ENV: "production",
  APP_ENV: "production",
  DEV_TEAM_PRODUCTION_ACCESS: "false",
  BETTER_AUTH_SECRET: "ci-placeholder-not-used-at-runtime-000000",
  BETTER_AUTH_URL: "https://app.example.edu",
  TLS_MIN_VERSION: "1.2",
  DATABASE_URL: "postgresql://localhost:5432/prod",
  AUDIT_DATABASE_URL: "postgresql://localhost:5432/audit",
  BACKUP_TEST_DATABASE_URL: "postgresql://localhost:5432/test",
  DATA_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  DATA_ENCRYPTION_KEY_ROTATED_AT: TODAY,
  KEY_CUSTODIAN_1: "Custodiante A",
  KEY_CUSTODIAN_2: "Custodiante B",
  MAINTENANCE_SECRET: "maintenance-secret-000000",
  BACKUP_LOCAL_DIR: "/mnt/hd",
  BACKUP_CLOUD_DIR: "/mnt/cloud",
  BACKUP_CLOUD_REGION: "br-sudeste",
  BACKUP_CLOUD_MFA: "true",
  BACKUP_CLOUD_IMMUTABLE: "true",
};

function setEnv(values: Record<string, string>) {
  for (const key of Object.keys(process.env)) {
    if (key in ORIGINAL || key in values) continue;
    delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL, values);
}

beforeEach(() => {
  process.env = { ...ORIGINAL } as NodeJS.ProcessEnv;
});

afterEach(() => {
  process.env = { ...ORIGINAL } as NodeJS.ProcessEnv;
});

describe("validação de produção (11.2/11.3/12.1)", () => {
  it("aceita configuração completa e segura", () => {
    setEnv(VALID_PROD);
    expect(() => assertProductionSecrets()).not.toThrow();
  });

  it("exige HTTPS e TLS >= 1.2 (11.2.1)", () => {
    setEnv({ ...VALID_PROD, BETTER_AUTH_URL: "http://app.example.edu" });
    expect(() => assertProductionSecrets()).toThrow(/HTTPS/);
    setEnv({ ...VALID_PROD, TLS_MIN_VERSION: "1.0" });
    expect(() => assertProductionSecrets()).toThrow(/TLS_MIN_VERSION/);
  });

  it("exige bases de auditoria e teste distintas (10.3/11.3.4/12.1)", () => {
    setEnv({ ...VALID_PROD, AUDIT_DATABASE_URL: VALID_PROD.DATABASE_URL });
    expect(() => assertProductionSecrets()).toThrow(/distinto/);
  });

  it("exige dois custodiantes e rotação em dia (11.2.4)", () => {
    setEnv({ ...VALID_PROD, KEY_CUSTODIAN_2: "Custodiante A" });
    expect(() => assertProductionSecrets()).toThrow(/KEY_CUSTODIAN/);
    setEnv({ ...VALID_PROD, DATA_ENCRYPTION_KEY_ROTATED_AT: "2020-01-01" });
    expect(() => assertProductionSecrets()).toThrow(/rotação anual vencida/);
  });

  it("exige autorização para nuvem fora do Brasil (11.3.3/LGPD art. 33)", () => {
    setEnv({ ...VALID_PROD, BACKUP_CLOUD_REGION: "us-east-1" });
    expect(() => assertProductionSecrets()).toThrow(/INTERNATIONAL_TRANSFER/);
    setEnv({
      ...VALID_PROD,
      BACKUP_CLOUD_REGION: "us-east-1",
      INTERNATIONAL_TRANSFER_AUTHORIZATION: "Ofício 1/2026",
    });
    expect(() => assertProductionSecrets()).not.toThrow();
  });

  it("recusa acesso de desenvolvimento em produção (7.4/12.1)", () => {
    setEnv({ ...VALID_PROD, DEV_TEAM_PRODUCTION_ACCESS: "true" });
    expect(() => assertProductionSecrets()).toThrow(/Desenvolvimento/);
  });

  it("reporta status de rotação e nuvem", () => {
    setEnv(VALID_PROD);
    const rotation = keyRotationStatus(new Date(`${TODAY}T12:00:00Z`));
    expect(rotation.custodiansValid).toBe(true);
    expect(rotation.maxDays).toBe(KEY_ROTATION_DAYS);
    expect(keyRotationStatus(new Date("2028-01-01T00:00:00Z")).overdue).toBe(true);
    expect(backupCloudStatus().international).toBe(false);
  });
});
