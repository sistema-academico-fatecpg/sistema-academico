import { afterEach, describe, expect, it } from "vitest";
import {
  generateInstitutionalEmail,
  institutionalEmailDomain,
  slugifyName,
} from "./institutional-email";

const originalDomain = process.env.INSTITUTIONAL_EMAIL_DOMAIN;

afterEach(() => {
  if (originalDomain === undefined) delete process.env.INSTITUTIONAL_EMAIL_DOMAIN;
  else process.env.INSTITUTIONAL_EMAIL_DOMAIN = originalDomain;
});

describe("e-mail institucional gerado", () => {
  it("usa nome normalizado + código único de 6 caracteres", async () => {
    delete process.env.INSTITUTIONAL_EMAIL_DOMAIN;
    const email = await generateInstitutionalEmail("José da Silva", () => false);
    expect(email).toMatch(/^jose\.da\.silva[0-9a-f]{6}@academico\.com$/);
    expect(institutionalEmailDomain()).toBe("academico.com");
  });

  it("respeita o domínio configurado e evita colisões", async () => {
    process.env.INSTITUTIONAL_EMAIL_DOMAIN = "dominio.example";
    const used = new Set<string>();
    const first = await generateInstitutionalEmail("Ana", (candidate) => used.has(candidate));
    used.add(first);
    const second = await generateInstitutionalEmail("Ana", (candidate) => used.has(candidate));
    expect(first).not.toBe(second);
    expect(first).toMatch(/^ana[0-9a-f]{6}@dominio\.example$/);
  });

  it("normaliza nomes com acentos e caracteres especiais", () => {
    expect(slugifyName("José da Silva - Teste!")).toBe("jose.da.silva.teste");
  });
});
