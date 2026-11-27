import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findClassById,
  listForClassGroup,
  findByIdWithClass,
  setGrade,
  criticalRequest,
  auditRecord,
} = vi.hoisted(() => ({
  findClassById: vi.fn(),
  listForClassGroup: vi.fn(),
  findByIdWithClass: vi.fn(),
  setGrade: vi.fn(),
  criticalRequest: vi.fn(),
  auditRecord: vi.fn(async () => ({})),
}));

vi.mock("@/app/repositories/class-group.repository", () => ({
  ClassGroupRepository: class {
    findById = findClassById;
  },
}));

vi.mock("@/app/repositories/enrollment.repository", () => ({
  EnrollmentRepository: class {
    listForClassGroup = listForClassGroup;
    findByIdWithClass = findByIdWithClass;
  },
}));

vi.mock("@/app/repositories/grade.repository", () => ({
  GradeRepository: class {
    setGrade = setGrade;
  },
}));

vi.mock("@/app/lib/critical-operations/service", () => ({
  CriticalOperationService: class {
    request = criticalRequest;
  },
}));

vi.mock("@/app/lib/audit", () => ({
  createAuditService: () => ({ record: auditRecord }),
}));

import { createAuditService } from "@/app/lib/audit";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { EnrollmentRepository } from "@/app/repositories/enrollment.repository";
import { GradeRepository } from "@/app/repositories/grade.repository";
import type { AcademicActor } from "./enrollment-service";
import { GradeService } from "./grade-service";

function service() {
  return new GradeService(
    new ClassGroupRepository(),
    new EnrollmentRepository(),
    new GradeRepository(),
    new CriticalOperationService(),
    createAuditService(),
  );
}

const professor: AcademicActor = {
  id: "prof-1",
  roles: ["PROFESSOR"],
  ipAddress: "127.0.0.1",
};

const group = {
  id: "group-1",
  professorId: "prof-1",
  subject: { code: "MAT101", name: "Matemática" },
  academicPeriod: {
    gradesOpenAt: new Date("2000-01-01T00:00:00Z"),
    gradesCloseAt: new Date("2100-01-01T00:00:00Z"),
  },
};

function enrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: "enr-1",
    status: "ACTIVE",
    classGroup: group,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  findClassById.mockResolvedValue(group);
  listForClassGroup.mockResolvedValue([
    {
      id: "enr-1",
      student: { name: "Ana", socialName: null, registrationNumber: "20260001" },
      grade: { value: "8.5", status: "PUBLISHED" },
    },
  ]);
  findByIdWithClass.mockResolvedValue(enrollment());
  setGrade.mockResolvedValue(undefined);
  criticalRequest.mockResolvedValue({ id: "req-1" });
});

describe("GradeService", () => {
  describe("roster", () => {
    it("retorna alunos e notas da turma do professor vinculado", async () => {
      const result = await service().roster(professor, "group-1");

      expect(result).toEqual([
        {
          enrollmentId: "enr-1",
          studentName: "Ana",
          registrationNumber: "20260001",
          subjectCode: "MAT101",
          subjectName: "Matemática",
          grade: 8.5,
          status: "PUBLISHED",
        },
      ]);
    });

    it("rejeita professor não vinculado à turma", async () => {
      findClassById.mockResolvedValue({ ...group, professorId: "outro-prof" });

      await expect(service().roster(professor, "group-1")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(listForClassGroup).not.toHaveBeenCalled();
    });
  });

  describe("setGrade", () => {
    it("lança nota como professor vinculado à turma", async () => {
      await service().setGrade(professor, { enrollmentId: "enr-1", value: 8.5 });

      expect(setGrade).toHaveBeenCalledWith({
        enrollmentId: "enr-1",
        professorId: "prof-1",
        value: 8.5,
      });
    });

    it("rejeita professor de outra turma sem lançar nota", async () => {
      findByIdWithClass.mockResolvedValue(
        enrollment({ classGroup: { ...group, professorId: "outro-prof" } }),
      );

      await expect(
        service().setGrade(professor, { enrollmentId: "enr-1", value: 8.5 }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(setGrade).not.toHaveBeenCalled();
    });

    it("rejeita matrícula cancelada sem lançar nota", async () => {
      findByIdWithClass.mockResolvedValue(enrollment({ status: "CANCELLED" }));

      await expect(
        service().setGrade(professor, { enrollmentId: "enr-1", value: 8.5 }),
      ).rejects.toMatchObject({ code: "VALIDATION", message: "Matrícula não está ativa" });
      expect(setGrade).not.toHaveBeenCalled();
    });
  });

  describe("requestCorrection", () => {
    it("rejeita matrícula cancelada sem abrir solicitação", async () => {
      findByIdWithClass.mockResolvedValue(enrollment({ status: "CANCELLED" }));

      await expect(
        service().requestCorrection(professor, {
          enrollmentId: "enr-1",
          value: 7,
          reason: "Correção após fechamento",
        }),
      ).rejects.toMatchObject({ code: "VALIDATION", message: "Matrícula não está ativa" });
      expect(criticalRequest).not.toHaveBeenCalled();
    });
  });
});
