import { beforeEach, describe, expect, it, vi } from "vitest";

const { findById, assignProfessorIfFree, upsertForStudent } = vi.hoisted(() => ({
  findById: vi.fn(),
  assignProfessorIfFree: vi.fn(),
  upsertForStudent: vi.fn(),
}));

vi.mock("@/app/repositories/class-group.repository", () => ({
  ClassGroupRepository: class {
    findById = findById;
    assignProfessorIfFree = assignProfessorIfFree;
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
  assignProfessorIfFree.mockResolvedValue({ count: 1 });
  upsertForStudent.mockResolvedValue({});
});

describe("assignUserToClassGroup", () => {
  it("vincula professor à turma para que GradeService autorize o lançamento", async () => {
    await assignUserToClassGroup({ ...base, role: "PROFESSOR" });
    expect(assignProfessorIfFree).toHaveBeenCalledWith("group-1", "user-1");
    expect(upsertForStudent).not.toHaveBeenCalled();
  });

  it("não sobrescreve professor vinculado por outra requisição", async () => {
    assignProfessorIfFree.mockResolvedValue({ count: 0 });
    await expect(assignUserToClassGroup({ ...base, role: "PROFESSOR" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
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
