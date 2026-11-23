import { describe, expect, it } from "vitest";
import { passwordMinimumLength, validatePassword } from "./password-policy";

describe("política de senhas", () => {
  it("exige 12 caracteres para perfis com MFA", () => {
    const result = validatePassword({
      password: "Abcdef1!",
      roles: ["PROFESSOR"],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.join(" ")).toContain("12 caracteres");
    }
  });

  it("exige 15 caracteres para aluno sem MFA", () => {
    expect(passwordMinimumLength(["ALUNO"])).toBe(15);
    const result = validatePassword({ password: "Abcdefghij1!x", roles: ["ALUNO"] });
    expect(result.valid).toBe(false);
  });

  it("aceita senha forte", () => {
    const result = validatePassword({
      password: "UmaSenhaMuitoForte#2026",
      name: "Maria Silva",
      registrationNumber: "20260001",
      roles: ["ALUNO"],
    });
    expect(result).toEqual({ valid: true });
  });

  it("recusa senhas comuns e explica o motivo", () => {
    const result = validatePassword({
      password: "Senha@123",
      roles: ["PROFESSOR"],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.join(" ")).toContain("senhas comuns");
    }
  });

  it("recusa senha contendo nome ou matrícula", () => {
    const byName = validatePassword({
      password: "MariaSilva#2026x",
      name: "Maria Silva",
      roles: ["PROFESSOR"],
    });
    expect(byName.valid).toBe(false);

    const byRegistration = validatePassword({
      password: "Matricula20260001#",
      registrationNumber: "20260001",
      roles: ["PROFESSOR"],
    });
    expect(byRegistration.valid).toBe(false);
  });

  it("exige composição completa", () => {
    const result = validatePassword({
      password: "somenteletrasminusculas",
      roles: ["PROFESSOR"],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          "A senha deve conter letra maiúscula.",
          "A senha deve conter número.",
          "A senha deve conter caractere especial.",
        ]),
      );
    }
  });
});
