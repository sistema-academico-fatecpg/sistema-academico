import { describe, expect, it } from "vitest";
import {
  CRITICAL_OPERATION_PERMISSION,
  hasPermission,
  MFA_REQUIRED_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  requiresMfa,
  sessionInactivitySeconds,
} from "@/app/types/roles";

describe("RBAC", () => {
  it("atribui permissões somente a perfis", () => {
    expect(hasPermission(["ALUNO"], PERMISSIONS.GRADES_READ)).toBe(true);
    expect(hasPermission(["ALUNO"], PERMISSIONS.GRADES_UPDATE)).toBe(false);
  });

  it("não permite que Admin Master acesse logs de auditoria", () => {
    expect(hasPermission(["ADMIN_MASTER"], PERMISSIONS.AUDIT_LOGS_READ)).toBe(false);
    expect(hasPermission(["AUDITOR"], PERMISSIONS.AUDIT_LOGS_READ)).toBe(true);
  });

  it("não permite que Admin Master lance ou edite notas", () => {
    expect(hasPermission(["ADMIN_MASTER"], PERMISSIONS.GRADES_READ)).toBe(true);
    expect(hasPermission(["ADMIN_MASTER"], PERMISSIONS.GRADES_UPDATE)).toBe(false);
    expect(hasPermission(["PROFESSOR"], PERMISSIONS.GRADES_UPDATE)).toBe(true);
  });

  it("mantém o Suporte Técnico sem permissões permanentes", () => {
    expect(ROLE_PERMISSIONS.SUPORTE_TECNICO).toHaveLength(0);
  });

  it("exige MFA para perfis sensíveis e não para alunos", () => {
    expect(requiresMfa(["ADMIN_MASTER"])).toBe(true);
    expect(requiresMfa(["PROFESSOR"])).toBe(true);
    expect(requiresMfa(["ALUNO"])).toBe(false);
    expect(MFA_REQUIRED_ROLES).not.toContain("ALUNO");
  });

  it("define inatividade de 15 minutos para perfis internos e 30 para alunos", () => {
    expect(sessionInactivitySeconds(["ADMIN_MASTER"])).toBe(15 * 60);
    expect(sessionInactivitySeconds(["ALUNO"])).toBe(30 * 60);
  });

  it("mapeia cada operação crítica para a permissão de solicitação", () => {
    expect(CRITICAL_OPERATION_PERMISSION.GRADE_CORRECTION_AFTER_CLOSING).toBe(
      PERMISSIONS.GRADES_UPDATE,
    );
    expect(CRITICAL_OPERATION_PERMISSION.INCLUDE_OR_REPLACE_ADMIN_MASTER).toBe(
      PERMISSIONS.ROLES_CREATE,
    );
  });
});
