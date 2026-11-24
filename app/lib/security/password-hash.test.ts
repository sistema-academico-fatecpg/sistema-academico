import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/app/lib/security/password-hash";

describe("hash de senha", () => {
  it("usa Argon2id e nunca devolve a senha em texto puro", async () => {
    const hash = await hashPassword("SenhaForte@2026");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("SenhaForte@2026");
  });

  it("verifica a senha correta e rejeita a incorreta", async () => {
    const hash = await hashPassword("SenhaForte@2026");
    await expect(verifyPassword(hash, "SenhaForte@2026")).resolves.toBe(true);
    await expect(verifyPassword(hash, "OutraSenha@2026")).resolves.toBe(false);
  });

  it("não quebra com hash inválido", async () => {
    await expect(verifyPassword("nao-e-um-hash", "SenhaForte@2026")).resolves.toBe(false);
  });
});
