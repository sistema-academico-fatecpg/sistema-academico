import { describe, expect, it, vi } from "vitest";
import { generateNumericCode, hashToken, TokenService } from "./tokens";

class FakeTokenRepository {
  records: Array<{
    id: string;
    userId: string;
    purpose: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }> = [];
  invalidated: Array<{ userId: string; purpose?: string }> = [];

  async invalidateForUser(userId: string, purpose?: string) {
    this.invalidated.push({ userId, purpose });
    for (const record of this.records) {
      if (record.userId === userId && (!purpose || record.purpose === purpose)) {
        record.usedAt = new Date();
      }
    }
  }

  async create(input: { userId: string; purpose: string; tokenHash: string; expiresAt: Date }) {
    const record = {
      id: String(this.records.length + 1),
      usedAt: null,
      ...input,
    };
    this.records.push(record);
    return record;
  }

  async findByHash(tokenHash: string) {
    return this.records.find((record) => record.tokenHash === tokenHash) ?? null;
  }

  async consume(id: string) {
    const record = this.records.find((item) => item.id === id);
    if (record) record.usedAt = new Date();
    return record;
  }
}

describe("tokens de uso único", () => {
  it("gera códigos numéricos de 6 dígitos", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateNumericCode()).toMatch(/^\d{6}$/);
    }
  });

  it("nunca persiste o token em claro", async () => {
    const repository = new FakeTokenRepository();
    const service = new TokenService(repository as never);
    const issued = await service.issue("user-1", "ACCOUNT_ACTIVATION");

    expect(issued.token).not.toHaveLength(0);
    const stored = repository.records.find((record) => record.purpose === "ACCOUNT_ACTIVATION");
    expect(stored?.tokenHash).toBe(hashToken(issued.token));
    expect(stored?.tokenHash).not.toBe(issued.token);
  });

  it("invalida links anteriores do mesmo propósito", async () => {
    const repository = new FakeTokenRepository();
    const service = new TokenService(repository as never);
    await service.issue("user-1", "PASSWORD_RESET");
    await service.issue("user-1", "PASSWORD_RESET");

    const active = repository.records.filter(
      (record) => record.purpose === "PASSWORD_RESET" && !record.usedAt,
    );
    expect(active).toHaveLength(1);
  });

  it("consome o token uma única vez", async () => {
    const repository = new FakeTokenRepository();
    const service = new TokenService(repository as never);
    const issued = await service.issue("user-1", "PASSWORD_RESET");

    const first = await service.consume(issued.token, "PASSWORD_RESET");
    const second = await service.consume(issued.token, "PASSWORD_RESET");

    expect(first?.userId).toBe("user-1");
    expect(second).toBeNull();
  });

  it("recusa token expirado", async () => {
    const repository = new FakeTokenRepository();
    const service = new TokenService(repository as never);
    const issued = await service.issue("user-1", "PASSWORD_RESET");
    const record = repository.records.find((item) => item.tokenHash === hashToken(issued.token));
    if (record) record.expiresAt = new Date(Date.now() - 1000);

    expect(await service.consume(issued.token, "PASSWORD_RESET")).toBeNull();
  });

  it("valida o código de confirmação sem consumi-lo", async () => {
    const repository = new FakeTokenRepository();
    const service = new TokenService(repository as never);
    const issued = await service.issue("user-1", "ACCOUNT_ACTIVATION");

    const repositorySpy = vi.spyOn(repository, "consume");
    expect(await service.verifyConfirmationCode("user-1", issued.code)).toBe(true);
    expect(repositorySpy).not.toHaveBeenCalled();
    expect(await service.verifyConfirmationCode("user-2", issued.code)).toBe(false);
  });
});
