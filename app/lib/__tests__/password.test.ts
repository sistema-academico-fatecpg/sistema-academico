import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("Password Hashing", () => {
  it("deve criar hash e verificar senha corretamente", async () => {
    const password = "Senha@123456";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("deve rejeitar senha incorreta", async () => {
    const password = "Senha@123456";
    const wrongPassword = "OutraSenha@789";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it("deve gerar hashes diferentes para a mesma senha", async () => {
    const password = "Senha@123456";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});
