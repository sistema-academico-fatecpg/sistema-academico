import { describe, expect, it } from "vitest";
import type { RoleName } from "@/app/types/common";
import { assertCanAssignRole, roleRequiresApproval, visibleRolesFor } from "./account-service";

function actor(roles: RoleName[]) {
  return { actorId: "actor-1", actorRoles: roles, ipAddress: "127.0.0.1" };
}

describe("regras de atribuição de perfil", () => {
  it("Admin Secundário cadastra apenas alunos e professores", () => {
    expect(() => assertCanAssignRole(actor(["ADMIN_SECUNDARIO"]), "ALUNO")).not.toThrow();
    expect(() => assertCanAssignRole(actor(["ADMIN_SECUNDARIO"]), "PROFESSOR")).not.toThrow();
    expect(() => assertCanAssignRole(actor(["ADMIN_SECUNDARIO"]), "ADMIN_MASTER")).toThrow();
    expect(() => assertCanAssignRole(actor(["ADMIN_SECUNDARIO"]), "AUDITOR")).toThrow();
  });

  it("somente Admin Master atribui perfis administrativos", () => {
    expect(() => assertCanAssignRole(actor(["ADMIN_MASTER"]), "ADMIN_SECUNDARIO")).not.toThrow();
    expect(() => assertCanAssignRole(actor(["PROFESSOR"]), "ALUNO")).toThrow();
  });

  it("perfis administrativos exigem dupla aprovação", () => {
    expect(roleRequiresApproval("ADMIN_MASTER")).toBe(true);
    expect(roleRequiresApproval("ADMIN_SECUNDARIO")).toBe(true);
    expect(roleRequiresApproval("ALUNO")).toBe(false);
    expect(roleRequiresApproval("PROFESSOR")).toBe(false);
  });

  it("lista apenas usuários gerenciáveis pelo perfil", () => {
    expect(visibleRolesFor(["ADMIN_SECUNDARIO"])).toEqual(["PROFESSOR", "ALUNO"]);
    expect(visibleRolesFor(["ADMIN_MASTER"])).not.toContain("ADMIN_MASTER");
    expect(visibleRolesFor(["ALUNO"])).toEqual([]);
  });
});
