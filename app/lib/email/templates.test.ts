import { describe, expect, it } from "vitest";
import {
  accountActivationEmail,
  emailConfirmationCodeEmail,
  maskEmail,
  passwordResetEmail,
} from "./index";

describe("templates de e-mail", () => {
  it("envia link de ativação com o código na URL e informa o e-mail institucional", () => {
    const email = accountActivationEmail({
      to: "pessoal@gmail.com",
      name: "Ana <script>",
      institutionalEmail: "aluno@exemplo.com",
      personalEmail: "pessoal@gmail.com",
      activationUrl: "https://app.local/ativar?token=abc&code=123456",
    });

    expect(email.to).toBe("pessoal@gmail.com");
    expect(email.subject).toContain("Ative");
    expect(email.text).toContain("https://app.local/ativar?token=abc&code=123456");
    expect(email.text).toContain("aluno@exemplo.com");
    expect(email.html).toContain("aluno@exemplo.com");
    expect(email.text).not.toMatch(/senha\s*:/i);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("envia código de confirmação válido por 10 minutos", () => {
    const email = emailConfirmationCodeEmail({
      to: "aluno@exemplo.com",
      name: "Ana",
      code: "654321",
    });
    expect(email.text).toContain("10 minutos");
    expect(email.text).toContain("654321");
  });

  it("envia link de redefinição válido por 30 minutos", () => {
    const email = passwordResetEmail({
      to: "aluno@exemplo.com",
      name: "Ana",
      resetUrl: "https://app.local/redefinir?token=xyz",
    });
    expect(email.text).toContain("30 minutos");
    expect(email.text).toContain("token=xyz");
  });

  it("mascara o endereço de e-mail em logs", () => {
    expect(maskEmail("maria@exemplo.com")).toBe("ma***@exemplo.com");
    expect(maskEmail("invalido")).toBe("***");
  });
});
