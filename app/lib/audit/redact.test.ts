import { describe, expect, it } from "vitest";
import { redactSensitiveData, redactText } from "./redact";

describe("redactSensitiveData", () => {
  it("remove senhas, tokens e códigos em qualquer profundidade", () => {
    const result = redactSensitiveData({
      name: "Maria",
      password: "Senha@123",
      nested: {
        accessToken: "abc",
        code: "123456",
        keep: "visível",
        items: [{ secret: "x", value: 1 }],
      },
    }) as Record<string, unknown>;

    expect(result.name).toBe("Maria");
    expect(result.password).toBe("[REDACTED]");
    expect(result.nested).toMatchObject({
      accessToken: "[REDACTED]",
      code: "[REDACTED]",
      keep: "visível",
      items: [{ secret: "[REDACTED]", value: 1 }],
    });
  });

  it("preserva datas e valores primitivos", () => {
    expect(redactSensitiveData(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(redactSensitiveData(42)).toBe(42);
    expect(redactSensitiveData(null)).toBeNull();
  });

  it("redige textos que mencionam campos sensíveis", () => {
    expect(redactText("token=abc123")).toBe("[REDACTED]");
    expect(redactText("Maria")).toBe("Maria");
  });
});
