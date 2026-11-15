import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRepository } from "@/repositories/user.repository";

const createMockDb = () => {
  const mockDb: any = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    userRole: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    token: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    mfaRecoveryCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    supportAccessGrant: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    supportAccessModule: {
      create: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    criticalOperationRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    log: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  mockDb.$transaction = vi.fn(async (callback: any) => callback(mockDb));
  return mockDb;
};

describe("UserRepository", () => {
  let repo: UserRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new UserRepository(mockDb as any);
  });

  it("deve ser instanciável", () => {
    expect(repo).toBeInstanceOf(UserRepository);
  });

  it("deve ter método findByEmail", () => {
    expect(typeof repo.findByEmail).toBe("function");
  });

  it("deve ter método findByInstitutionalEmail", () => {
    expect(typeof repo.findByInstitutionalEmail).toBe("function");
  });

  it("deve ter método create", () => {
    expect(typeof repo.create).toBe("function");
  });

  it("deve ter método update", () => {
    expect(typeof repo.update).toBe("function");
  });

  it("deve ter método assignRole", () => {
    expect(typeof repo.assignRole).toBe("function");
  });

  it("deve ter método removeRole", () => {
    expect(typeof repo.removeRole).toBe("function");
  });

  it("deve ter método hasRole", () => {
    expect(typeof repo.hasRole).toBe("function");
  });

  it("deve ter método activateUser", () => {
    expect(typeof repo.activateUser).toBe("function");
  });

  it("deve ter método blockUser", () => {
    expect(typeof repo.blockUser).toBe("function");
  });

  it("deve ter método deactivateUser", () => {
    expect(typeof repo.deactivateUser).toBe("function");
  });

  describe("findByEmail", () => {
    it("deve retornar usuário quando encontrado", async () => {
      const mockUser = {
        id: "user-1",
        email: "joao@exemplo.com",
        name: "João",
        role: { name: "ALUNO" },
      };
      mockDb.user.findUnique.mockResolvedValue(mockUser);

      const result = await repo.findByEmail("joao@exemplo.com");

      expect(result).toEqual(mockUser);
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { email: "joao@exemplo.com" },
        include: { role: true },
      });
    });

    it("deve retornar null quando não encontrado", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const result = await repo.findByEmail("nao@existe.com");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("deve criar usuário com dados fornecidos", async () => {
      const mockUser = {
        id: "user-1",
        name: "João",
        email: "joao@exemplo.com",
        role: { name: "ALUNO" },
      };
      mockDb.user.create.mockResolvedValue(mockUser);

      const result = await repo.create({
        name: "João",
        email: "joao@exemplo.com",
        institutionalEmail: "joao.silva@exemplo.edu.br",
        role: { connect: { name: "ALUNO" } },
        status: "PENDING_ACTIVATION",
        passwordHash: "hash",
        mfaEnabled: false,
      } as any);

      expect(result).toEqual(mockUser);
      expect(mockDb.user.create).toHaveBeenCalledWith({
        data: {
          name: "João",
          email: "joao@exemplo.com",
          institutionalEmail: "joao.silva@exemplo.edu.br",
          role: { connect: { name: "ALUNO" } },
          status: "PENDING_ACTIVATION",
          passwordHash: "hash",
          mfaEnabled: false,
        },
      });
    });
  });

  describe("assignRole", () => {
    it("deve atribuir papel ao usuário", async () => {
      const mockRole = { id: "role-1", name: "PROFESSOR" };
      const mockUserRole = { userId: "user-1", roleId: "role-1" };
      mockDb.role.findUnique.mockResolvedValue(mockRole);
      mockDb.userRole.create.mockResolvedValue(mockUserRole);

      const result = await repo.assignRole("user-1", "PROFESSOR");

      expect(result).toEqual(mockUserRole);
      expect(mockDb.role.findUnique).toHaveBeenCalledWith({
        where: { name: "PROFESSOR" },
      });
      expect(mockDb.userRole.create).toHaveBeenCalledWith({
        data: { userId: "user-1", roleId: "role-1" },
      });
    });

    it("deve lançar erro quando papel não existe", async () => {
      mockDb.role.findUnique.mockResolvedValue(null);

      await expect(repo.assignRole("user-1", "INVALID_ROLE" as any)).rejects.toThrow(
        "Role INVALID_ROLE não encontrado",
      );
    });
  });
});
