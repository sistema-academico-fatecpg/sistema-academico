import { describe, it, expect } from "vitest";
import { EmailSchema, PasswordSchema, RoleNameSchema, UserInputSchema } from "@/lib/validations";

describe("Zod Schemas", () => {
  describe("EmailSchema", () => {
    it("deve aceitar emails válidos", () => {
      expect(EmailSchema.safeParse("usuario@exemplo.com").success).toBe(true);
      expect(EmailSchema.safeParse("usuario.nome@dominio.edu.br").success).toBe(true);
    });

    it("deve rejeitar emails inválidos", () => {
      expect(EmailSchema.safeParse("email-invalido").success).toBe(false);
      expect(EmailSchema.safeParse("@semusuario.com").success).toBe(false);
      expect(EmailSchema.safeParse("usuario@").success).toBe(false);
    });
  });

  describe("PasswordSchema", () => {
    it("deve aceitar senhas válidas", () => {
      expect(PasswordSchema.safeParse("Senha@123456").success).toBe(true);
      expect(PasswordSchema.safeParse("MinhaSenha@2024!").success).toBe(true);
    });

    it("deve rejeitar senhas curtas", () => {
      expect(PasswordSchema.safeParse("Senha@12").success).toBe(false);
    });

    it("deve rejeitar senhas sem maiúscula", () => {
      expect(PasswordSchema.safeParse("senha@123456").success).toBe(false);
    });

    it("deve rejeitar senhas sem número", () => {
      expect(PasswordSchema.safeParse("Senha@abcdefg").success).toBe(false);
    });

    it("deve rejeitar senhas sem caractere especial", () => {
      expect(PasswordSchema.safeParse("Senha123456").success).toBe(false);
    });
  });

  describe("RoleNameSchema", () => {
    it("deve aceitar todos os papéis válidos", () => {
      const roles = ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"];
      roles.forEach((role) => {
        expect(RoleNameSchema.safeParse(role).success).toBe(true);
      });
    });

    it("deve rejeitar papéis inválidos", () => {
      expect(RoleNameSchema.safeParse("INVALID_ROLE").success).toBe(false);
    });
  });

  describe("UserInputSchema", () => {
    it("deve aceitar dados válidos de usuário", () => {
      const validInput = {
        name: "João Silva",
        email: "joao@exemplo.com",
        institutionalEmail: "joao.silva@exemplo.edu.br",
        role: "ALUNO",
      };
      expect(UserInputSchema.safeParse(validInput).success).toBe(true);
    });

    it("deve rejeitar nome vazio", () => {
      const invalidInput = {
        name: "",
        email: "joao@exemplo.com",
        institutionalEmail: "joao.silva@exemplo.edu.br",
        role: "ALUNO",
      };
      expect(UserInputSchema.safeParse(invalidInput).success).toBe(false);
    });
  });
});
