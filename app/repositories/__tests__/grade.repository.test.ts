import { describe, it, expect, vi, beforeEach } from "vitest";
import { GradeRepository } from "@/repositories/grade.repository";

const createMockDb = () => ({
  grade: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

describe("GradeRepository", () => {
  let repo: GradeRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new GradeRepository(mockDb as any);
  });

  it("deve ser instanciável", () => {
    expect(repo).toBeInstanceOf(GradeRepository);
  });

  it("deve ter método findByEnrollment", () => {
    expect(typeof repo.findByEnrollment).toBe("function");
  });

  it("deve ter método findByStudent", () => {
    expect(typeof repo.findByStudent).toBe("function");
  });

  describe("findByEnrollment", () => {
    it("deve retornar notas de uma matrícula", async () => {
      const mockGrades = [
        { id: "grade-1", enrollmentId: "enrollment-1", value: 8.5 },
      ];
      mockDb.grade.findMany.mockResolvedValue(mockGrades);

      const result = await repo.findByEnrollment("enrollment-1");

      expect(result).toEqual(mockGrades);
      expect(mockDb.grade.findMany).toHaveBeenCalledWith({
        where: { enrollmentId: "enrollment-1" },
      });
    });
  });
});
