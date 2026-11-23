import { describe, expect, it } from "vitest";
import {
  accountActivationEmail,
  emailConfirmationCodeEmail,
  maskEmail,
  passwordResetEmail,
} from "./index";

describe("templates de e-mail", () => {
  it("envia link de ativação de uso único e código, sem senha", () => {
    const email = accountActivationEmail({
      to: "aluno@faculdade.edu.br",
      name: "Ana <script>",
      activationUrl: "https://app.local/ativar?token=abc",
      code: "123456",
    });

    expect(email.subject).toContain("Ative");
    expect(email.text).toContain("https://app.local/ativar?token=abc");
    expect(email.text).toContain("123456");
    expect(email.text).not.toMatch(/senha\s*:/i);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("envia código de confirmação válido por 10 minutos", () => {
    const email = emailConfirmationCodeEmail({
      to: "aluno@faculdade.edu.br",
      name: "Ana",
      code: "654321",
    });
    expect(email.text).toContain("10 minutos");
    expect(email.text).toContain("654321");
  });

  it("envia link de redefinição válido por 30 minutos", () => {
    const email = passwordResetEmail({
      to: "aluno@faculdade.edu.br",
      name: "Ana",
      resetUrl: "https://app.local/redefinir?token=xyz",
    });
    expect(email.text).toContain("30 minutos");
    expect(email.text).toContain("token=xyz");
  });

  it("mascara o endereço de e-mail em logs", () => {
    expect(maskEmail("maria@faculdade.edu.br")).toBe("ma***@faculdade.edu.br");
    expect(maskEmail("invalido")).toBe("***");
  });
});
