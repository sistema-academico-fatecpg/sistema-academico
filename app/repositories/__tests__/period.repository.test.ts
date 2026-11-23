import { describe, it, expect, vi, beforeEach } from "vitest";
import { PeriodRepository } from "@/repositories/period.repository";

const createMockDb = () => ({
  period: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

describe("PeriodRepository", () => {
  let repo: PeriodRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new PeriodRepository(mockDb as any);
  });

  it("deve ser instanciável", () => {
    expect(repo).toBeInstanceOf(PeriodRepository);
  });

  it("deve ter método findByCode", () => {
    expect(typeof repo.findByCode).toBe("function");
  });

  it("deve ter método findActive", () => {
    expect(typeof repo.findActive).toBe("function");
  });

  it("deve ter método findByCourse", () => {
    expect(typeof repo.findByCourse).toBe("function");
  });

  describe("findByCode", () => {
    it("deve retornar período quando encontrado", async () => {
      const mockPeriod = { id: "period-1", name: "2024.1", code: "P20241" };
      mockDb.period.findUnique.mockResolvedValue(mockPeriod);

      const result = await repo.findByCode("P20241");

      expect(result).toEqual(mockPeriod);
      expect(mockDb.period.findUnique).toHaveBeenCalledWith({
        where: { code: "P20241" },
      });
    });

    it("deve retornar null quando não encontrado", async () => {
      mockDb.period.findUnique.mockResolvedValue(null);

      const result = await repo.findByCode("INEXISTENTE");

      expect(result).toBeNull();
    });
  });

  describe("findActive", () => {
    it("deve retornar períodos ativos", async () => {
      const mockPeriods = [
        { id: "period-1", name: "2024.1", isActive: true },
      ];
      mockDb.period.findMany.mockResolvedValue(mockPeriods);

      const result = await repo.findActive();

      expect(result).toEqual(mockPeriods);
      expect(mockDb.period.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  describe("findByCourse", () => {
    it("deve retornar períodos de um curso", async () => {
      const mockPeriods = [
        { id: "period-1", name: "2024.1", courseId: "course-1" },
      ];
      mockDb.period.findMany.mockResolvedValue(mockPeriods);

      const result = await repo.findByCourse("course-1");

      expect(result).toEqual(mockPeriods);
      expect(mockDb.period.findMany).toHaveBeenCalledWith({
        where: { courseId: "course-1" },
      });
    });
  });
});
