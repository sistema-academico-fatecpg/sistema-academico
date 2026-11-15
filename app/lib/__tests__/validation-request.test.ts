import { describe, it, expect } from "vitest";
import { validateRequest } from "@/lib/validation";
import {
  UserInputSchema,
  LoginSchema,
} from "@/lib/validations";
import {
  EnrollmentInputSchema,
  GradeInputSchema,
} from "@/types/academic";

describe("validateRequest", () => {
  it("deve retornar sucesso para dados válidos", () => {
    const result = validateRequest(LoginSchema, {
      email: "joao@exemplo.com",
      password: "Senha@123456",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("joao@exemplo.com");
      expect(result.data.password).toBe("Senha@123456");
    }
  });

  it("deve retornar erro para dados inválidos", () => {
    const result = validateRequest(LoginSchema, {
      email: "email-invalido",
      password: "curto",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod para no primeiro erro (abort early), então pelo menos um campo deve ter erro
      const hasError = result.error.email || result.error.password;
      expect(hasError).toBeDefined();
    }
  });

  it("deve validar UserInputSchema corretamente", () => {
    const validInput = {
      name: "João Silva",
      email: "joao@exemplo.com",
      institutionalEmail: "joao.silva@exemplo.edu.br",
      role: "ALUNO",
    };
    const result = validateRequest(UserInputSchema, validInput);
    expect(result.success).toBe(true);
  });

  it("deve rejeitar UserInputSchema com nome vazio", () => {
    const invalidInput = {
      name: "",
      email: "joao@exemplo.com",
      institutionalEmail: "joao.silva@exemplo.edu.br",
      role: "ALUNO",
    };
    const result = validateRequest(UserInputSchema, invalidInput);
    expect(result.success).toBe(false);
  });

  describe("EnrollmentInputSchema", () => {
    it("deve aceitar matrícula válida", () => {
      const result = validateRequest(EnrollmentInputSchema, {
        studentId: "550e8400-e29b-41d4-a716-446655440000",
        subjectId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar studentId inválido", () => {
      const result = validateRequest(EnrollmentInputSchema, {
        studentId: "não-é-uuid",
        subjectId: "subject-1",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("GradeInputSchema", () => {
    it("deve aceitar nota válida", () => {
      const result = validateRequest(GradeInputSchema, {
        enrollmentId: "550e8400-e29b-41d4-a716-446655440000",
        value: 8.5,
        type: "EXAM",
        recordedBy: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar nota menor que 0", () => {
      const result = validateRequest(GradeInputSchema, {
        enrollmentId: "enrollment-1",
        value: -1,
        type: "EXAM",
        recordedBy: "user-1",
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar nota maior que 10", () => {
      const result = validateRequest(GradeInputSchema, {
        enrollmentId: "enrollment-1",
        value: 11,
        type: "EXAM",
        recordedBy: "user-1",
      });
      expect(result.success).toBe(false);
    });
  });
});
