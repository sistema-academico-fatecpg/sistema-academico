import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/jwt";

describe("JWT Utilities", () => {
  const payload = {
    sub: "user-123",
    email: "usuario@exemplo.com",
    role: "ALUNO",
  };

  it("deve assinar e verificar token corretamente", async () => {
    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("user-123");
    expect(decoded?.email).toBe("usuario@exemplo.com");
    expect(decoded?.role).toBe("ALUNO");
  });

  it("deve rejeitar token inválido", () => {
    const result = verifyToken("token.invalido");
    expect(result).toBeNull();
  });

  it("deve rejeitar token vazio", () => {
    const result = verifyToken("");
    expect(result).toBeNull();
  });
});
