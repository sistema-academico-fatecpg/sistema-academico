import { beforeEach, describe, expect, it, vi } from "vitest";

const { findById, assignProfessor, upsertForStudent } = vi.hoisted(() => ({
  findById: vi.fn(),
  assignProfessor: vi.fn(),
  upsertForStudent: vi.fn(),
}));

vi.mock("@/app/repositories/class-group.repository", () => ({
  ClassGroupRepository: class {
    findById = findById;
    assignProfessor = assignProfessor;
  },
}));

vi.mock("@/app/repositories/enrollment.repository", () => ({
  EnrollmentRepository: class {
    upsertForStudent = upsertForStudent;
  },
}));

import { assignUserToClassGroup } from "./class-assignment";

const base = { userId: "user-1", actorId: "admin-1", classGroupId: "group-1" };

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockResolvedValue({ id: "group-1", professorId: null });
  assignProfessor.mockResolvedValue({});
  upsertForStudent.mockResolvedValue({});
});

describe("assignUserToClassGroup", () => {
  it("vincula professor à turma para que GradeService autorize o lançamento", async () => {
    await assignUserToClassGroup({ ...base, role: "PROFESSOR" });
    expect(assignProfessor).toHaveBeenCalledWith("group-1", "user-1");
    expect(upsertForStudent).not.toHaveBeenCalled();
  });

  it("não remove o professor já vinculado à turma", async () => {
    findById.mockResolvedValue({ id: "group-1", professorId: "outro-professor" });
    await expect(assignUserToClassGroup({ ...base, role: "PROFESSOR" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(assignProfessor).not.toHaveBeenCalled();
  });

  it("cria matrícula ativa do aluno na turma escolhida", async () => {
    await assignUserToClassGroup({ ...base, role: "ALUNO" });
    expect(upsertForStudent).toHaveBeenCalledWith({
      studentId: "user-1",
      classGroupId: "group-1",
      createdBy: "admin-1",
    });
  });

  it("rejeita turma inexistente e cargo sem vínculo de turma", async () => {
    findById.mockResolvedValue(null);
    await expect(assignUserToClassGroup({ ...base, role: "ALUNO" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    findById.mockResolvedValue({ id: "group-1", professorId: null });
    await expect(assignUserToClassGroup({ ...base, role: "AUDITOR" })).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});
