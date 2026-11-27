import { afterEach, describe, expect, it, vi } from "vitest";

const URL_KEYS = ["DATABASE_URL", "AUDIT_DATABASE_URL", "BACKUP_TEST_DATABASE_URL"] as const;
const COMPONENT_KEYS = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASS",
] as const;

const original = Object.fromEntries(
  [...URL_KEYS, ...COMPONENT_KEYS].map((key) => [key, process.env[key]]),
) as Record<string, string | undefined>;

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
});

async function load(clearUrls = true) {
  vi.resetModules();
  if (clearUrls) {
    for (const key of URL_KEYS) delete process.env[key];
  }
  return import("./database");
}

describe("URLs de banco derivadas", () => {
  it("monta as três URLs a partir dos componentes compartilhados", async () => {
    process.env.DATABASE_HOST = "db.local";
    process.env.DATABASE_PORT = "6543";
    process.env.DATABASE_NAME = "app_teste";
    process.env.DATABASE_USER = "usuario";
    process.env.DATABASE_PASS = "senha@123";
    await load();

    expect(process.env.DATABASE_URL).toBe(
      "postgresql://usuario:senha%40123@db.local:6543/app_teste",
    );
    expect(process.env.AUDIT_DATABASE_URL).toBe(
      "postgresql://usuario:senha%40123@db.local:6543/app_teste_audit",
    );
    expect(process.env.BACKUP_TEST_DATABASE_URL).toBe(
      "postgresql://usuario:senha%40123@db.local:6543/app_teste_backup_test",
    );
  });

  it("mantém URLs explicitamente configuradas", async () => {
    process.env.DATABASE_URL = "postgresql://prod:5432/explicito";
    process.env.AUDIT_DATABASE_URL = "postgresql://audit:5432/outro";
    process.env.DATABASE_NAME = "ignorado";
    await load(false);

    expect(process.env.DATABASE_URL).toBe("postgresql://prod:5432/explicito");
    expect(process.env.AUDIT_DATABASE_URL).toBe("postgresql://audit:5432/outro");
  });
});
