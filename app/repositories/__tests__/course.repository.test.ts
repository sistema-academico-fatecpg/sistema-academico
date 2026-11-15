import { describe, it, expect, vi, beforeEach } from "vitest";
import { CourseRepository } from "@/repositories/course.repository";

const createMockDb = () => ({
  course: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

describe("CourseRepository", () => {
  let repo: CourseRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new CourseRepository(mockDb as any);
  });

  it("deve ser instanciável", () => {
    expect(repo).toBeInstanceOf(CourseRepository);
  });

  it("deve ter método findByCode", () => {
    expect(typeof repo.findByCode).toBe("function");
  });

  it("deve ter método findWithSubjects", () => {
    expect(typeof repo.findWithSubjects).toBe("function");
  });

  describe("findByCode", () => {
    it("deve retornar curso quando encontrado", async () => {
      const mockCourse = { id: "course-1", name: "Matemática", code: "MAT101" };
      mockDb.course.findUnique.mockResolvedValue(mockCourse);

      const result = await repo.findByCode("MAT101");

      expect(result).toEqual(mockCourse);
      expect(mockDb.course.findUnique).toHaveBeenCalledWith({
        where: { code: "MAT101" },
      });
    });

    it("deve retornar null quando não encontrado", async () => {
      mockDb.course.findUnique.mockResolvedValue(null);

      const result = await repo.findByCode("INEXISTENTE");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("deve criar curso com dados fornecidos", async () => {
      const mockCourse = { id: "course-1", name: "Matemática", code: "MAT101" };
      mockDb.course.create.mockResolvedValue(mockCourse);

      const result = await repo.create({
        name: "Matemática",
        code: "MAT101",
        description: null,
      } as any);

      expect(result).toEqual(mockCourse);
      expect(mockDb.course.create).toHaveBeenCalledWith({
        data: {
          name: "Matemática",
          code: "MAT101",
          description: null,
        },
      });
    });
  });
});
