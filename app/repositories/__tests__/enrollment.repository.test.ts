import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnrollmentRepository } from "@/repositories/enrollment.repository";

const createMockDb = () => ({
  enrollment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

describe("EnrollmentRepository", () => {
  let repo: EnrollmentRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new EnrollmentRepository(mockDb as any);
  });

  it("deve ser instanciável", () => {
    expect(repo).toBeInstanceOf(EnrollmentRepository);
  });

  it("deve ter método findByStudent", () => {
    expect(typeof repo.findByStudent).toBe("function");
  });

  it("deve ter método findBySubject", () => {
    expect(typeof repo.findBySubject).toBe("function");
  });

  it("deve ter método findByStudentAndSubject", () => {
    expect(typeof repo.findByStudentAndSubject).toBe("function");
  });

  it("deve ter método updateGrade", () => {
    expect(typeof repo.updateGrade).toBe("function");
  });

  describe("findByStudent", () => {
    it("deve retornar matrículas de um estudante", async () => {
      const mockEnrollments = [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
      ];
      mockDb.enrollment.findMany.mockResolvedValue(mockEnrollments);

      const result = await repo.findByStudent("student-1");

      expect(result).toEqual(mockEnrollments);
      expect(mockDb.enrollment.findMany).toHaveBeenCalledWith({
        where: { studentId: "student-1" },
        include: { subject: true },
      });
    });
  });

  describe("findByStudentAndSubject", () => {
    it("deve retornar matrícula quando encontrada", async () => {
      const mockEnrollment = {
        id: "enrollment-1",
        studentId: "student-1",
        subjectId: "subject-1",
      };
      mockDb.enrollment.findUnique.mockResolvedValue(mockEnrollment);

      const result = await repo.findByStudentAndSubject("student-1", "subject-1");

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.enrollment.findUnique).toHaveBeenCalledWith({
        where: {
          studentId_subjectId: {
            studentId: "student-1",
            subjectId: "subject-1",
          },
        },
      });
    });

    it("deve retornar null quando não encontrada", async () => {
      mockDb.enrollment.findUnique.mockResolvedValue(null);

      const result = await repo.findByStudentAndSubject("student-1", "subject-1");

      expect(result).toBeNull();
    });
  });
});
