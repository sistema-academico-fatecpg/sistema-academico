import { describe, expect, it } from "vitest";
import { normalizeSkewedTotpCode, totpCodeAt } from "./totp-clock-skew";

const SECRET = "segredo-de-teste-com-32-caracteres";
const NOW = 1_800_000_000_000;
const COUNTER = Math.floor(NOW / 30_000);

describe("normalizeSkewedTotpCode", () => {
  it("não altera códigos da janela atual", () => {
    expect(normalizeSkewedTotpCode(SECRET, totpCodeAt(SECRET, COUNTER), NOW)).toBeNull();
  });

  it("converte códigos de janelas vizinhas para a janela atual", () => {
    const current = totpCodeAt(SECRET, COUNTER);
    expect(normalizeSkewedTotpCode(SECRET, totpCodeAt(SECRET, COUNTER + 1), NOW)).toBe(current);
    expect(normalizeSkewedTotpCode(SECRET, totpCodeAt(SECRET, COUNTER - 4), NOW)).toBe(current);
  });

  it("aceita códigos de outros algoritmos e períodos", () => {
    const current = totpCodeAt(SECRET, COUNTER);
    expect(normalizeSkewedTotpCode(SECRET, totpCodeAt(SECRET, COUNTER, "sha256"), NOW)).toBe(
      current,
    );
    expect(
      normalizeSkewedTotpCode(SECRET, totpCodeAt(SECRET, Math.floor(NOW / 60_000), "sha1"), NOW),
    ).toBe(current);
  });

  it("rejeita códigos fora da tolerância e valores inválidos", () => {
    expect(normalizeSkewedTotpCode(SECRET, totpCodeAt(SECRET, COUNTER + 5), NOW)).toBeNull();
    expect(normalizeSkewedTotpCode(SECRET, "12345", NOW)).toBeNull();
    expect(normalizeSkewedTotpCode(SECRET, "abcdef", NOW)).toBeNull();
  });
});
