import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubjectRepository } from "@/repositories/subject.repository";

const createMockDb = () => ({
  subject: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

describe("SubjectRepository", () => {
  let repo: SubjectRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new SubjectRepository(mockDb as any);
  });

  it("deve ser instanciável", () => {
    expect(repo).toBeInstanceOf(SubjectRepository);
  });

  it("deve ter método findByCode", () => {
    expect(typeof repo.findByCode).toBe("function");
  });

  it("deve ter método findByCourse", () => {
    expect(typeof repo.findByCourse).toBe("function");
  });

  it("deve ter método findByPeriod", () => {
    expect(typeof repo.findByPeriod).toBe("function");
  });

  describe("findByCode", () => {
    it("deve retornar disciplina quando encontrada", async () => {
      const mockSubject = { id: "subject-1", name: "Matemática", code: "MAT101" };
      mockDb.subject.findUnique.mockResolvedValue(mockSubject);

      const result = await repo.findByCode("MAT101");

      expect(result).toEqual(mockSubject);
      expect(mockDb.subject.findUnique).toHaveBeenCalledWith({
        where: { code: "MAT101" },
      });
    });

    it("deve retornar null quando não encontrada", async () => {
      mockDb.subject.findUnique.mockResolvedValue(null);

      const result = await repo.findByCode("INEXISTENTE");

      expect(result).toBeNull();
    });
  });

  describe("findByCourse", () => {
    it("deve retornar disciplinas de um curso", async () => {
      const mockSubjects = [
        { id: "subject-1", name: "Matemática", courseId: "course-1" },
      ];
      mockDb.subject.findMany.mockResolvedValue(mockSubjects);

      const result = await repo.findByCourse("course-1");

      expect(result).toEqual(mockSubjects);
      expect(mockDb.subject.findMany).toHaveBeenCalledWith({
        where: { courseId: "course-1" },
      });
    });
  });
});
