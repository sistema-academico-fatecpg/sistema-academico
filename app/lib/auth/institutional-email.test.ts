import { describe, expect, it } from "vitest";
import { generateInstitutionalEmail, roleEmailDomain, slugifyName } from "./institutional-email";

describe("e-mail institucional gerado", () => {
  it("usa nome + matrícula e o domínio do cargo", () => {
    expect(generateInstitutionalEmail("José da Silva", "0007", "ALUNO")).toBe(
      "jose.da.silva0007@aluno.academico.com",
    );
  });

  it("usa um domínio específico por cargo", () => {
    expect(roleEmailDomain("PROFESSOR")).toBe("prof.academico.com");
    expect(roleEmailDomain("ADMIN_MASTER")).toBe("coord.academico.com");
    expect(generateInstitutionalEmail("Ana", "0012", "PROFESSOR")).toBe(
      "ana0012@prof.academico.com",
    );
  });

  it("usa sufixo aleatório quando não há matrícula (bootstrap)", () => {
    expect(generateInstitutionalEmail("Ana", null, "ADMIN_MASTER")).toMatch(
      /^ana[0-9a-f]{6}@coord\.academico\.com$/,
    );
  });

  it("normaliza nomes com acentos e caracteres especiais", () => {
    expect(slugifyName("José da Silva - Teste!")).toBe("jose.da.silva.teste");
  });
});
