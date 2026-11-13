import { describe, expect, it } from "vitest";
import type { LogRepository } from "@/app/repositories/log.repository";
import { AUDIT_ACTIONS, AuditService } from "./audit-service";

class FakeLogRepository {
  appended: Array<Record<string, unknown>> = [];
  alerts: Array<{ type: string; message: string; metadata?: unknown }> = [];
  failures = 0;

  async append(input: Record<string, unknown>) {
    this.appended.push(input);
    return { id: "log-1", ...input };
  }

  async createAlert(type: string, message: string, metadata?: unknown) {
    this.alerts.push({ type, message, metadata });
    return { id: "alert-1", type, message, metadata };
  }

  async countRecentFailures() {
    return this.failures;
  }
}

function service(fake: FakeLogRepository) {
  return new AuditService(fake as unknown as LogRepository);
}

describe("AuditService", () => {
  it("grava logs sem senhas ou tokens", async () => {
    const fake = new FakeLogRepository();
    await service(fake).record({
      userId: "00000000-0000-4000-8000-000000000001" as never,
      ipAddress: "127.0.0.1",
      action: AUDIT_ACTIONS.ACCOUNT_CREATED,
      module: "USERS",
      result: "SUCCESS",
      oldValue: null,
      newValue: { name: "Ana", password: "Senha@123", token: "abc" },
    });

    expect(fake.appended).toHaveLength(1);
    expect(fake.appended[0].newValue).toEqual({
      name: "Ana",
      password: "[REDACTED]",
      token: "[REDACTED]",
    });
  });

  it("alerta o Auditor quando permissões são alteradas", async () => {
    const fake = new FakeLogRepository();
    await service(fake).record({
      ipAddress: "127.0.0.1",
      action: AUDIT_ACTIONS.PERMISSIONS_CHANGED,
      module: "ROLES",
      result: "SUCCESS",
    });

    expect(fake.alerts.map((alert) => alert.type)).toContain("PERMISSION_CHANGED");
  });

  it("alerta após sequência de falhas de login", async () => {
    const fake = new FakeLogRepository();
    fake.failures = 3;
    await service(fake).record({
      userId: "00000000-0000-4000-8000-000000000001" as never,
      ipAddress: "127.0.0.1",
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      module: "USERS",
      result: "FAILURE",
    });

    expect(fake.alerts.map((alert) => alert.type)).toContain("LOGIN_FAILURE_SEQUENCE");
  });

  it("alerta em tentativa de autoaprovação", async () => {
    const fake = new FakeLogRepository();
    await service(fake).record({
      userId: "00000000-0000-4000-8000-000000000001" as never,
      ipAddress: "127.0.0.1",
      action: AUDIT_ACTIONS.SELF_APPROVAL_ATTEMPT,
      module: "ROLES",
      result: "FAILURE",
    });

    expect(fake.alerts.map((alert) => alert.type)).toContain("SELF_APPROVAL_ATTEMPT");
  });
});
