// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, requirePermission, ownHistory, roster, setGrade } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requirePermission: vi.fn(),
  ownHistory: vi.fn(),
  roster: vi.fn(),
  setGrade: vi.fn(),
}));

vi.mock("@/app/lib/auth/session", () => ({ requireUser, requirePermission }));
vi.mock("@/app/lib/academic/enrollment-service", () => ({
  EnrollmentService: class {
    ownHistory = ownHistory;
  },
}));
vi.mock("@/app/lib/academic/grade-service", () => ({
  GradeService: class {
    roster = roster;
    setGrade = setGrade;
  },
}));

import { GET, POST } from "./route";

const actor = (roles: string[]) => ({
  id: "user-1",
  roles,
  permissions: new Set<string>(),
});

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue(actor(["ALUNO"]));
  requirePermission.mockResolvedValue(actor(["PROFESSOR"]));
  ownHistory.mockResolvedValue([{ enrollmentId: "e1" }]);
  roster.mockResolvedValue([{ enrollmentId: "e2" }]);
  setGrade.mockResolvedValue(undefined);
});

describe("/api/grades", () => {
  it("aluno recebe apenas as próprias notas, sem informar turma", async () => {
    const response = await GET(new Request("https://localhost/api/grades"));
    expect(response.status).toBe(200);
    expect(ownHistory).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }));
    expect(roster).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ items: [{ enrollmentId: "e1" }] });
  });

  it("professor recebe o diário da turma informada", async () => {
    requireUser.mockResolvedValue(actor(["PROFESSOR"]));
    const response = await GET(
      new Request("https://localhost/api/grades?classGroupId=11111111-1111-4111-8111-111111111111"),
    );
    expect(response.status).toBe(200);
    expect(roster).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      "11111111-1111-4111-8111-111111111111",
    );
    expect(ownHistory).not.toHaveBeenCalled();
  });

  it("professor sem turma informada recebe 400", async () => {
    requireUser.mockResolvedValue(actor(["PROFESSOR"]));
    const response = await GET(new Request("https://localhost/api/grades"));
    expect(response.status).toBe(400);
    expect(roster).not.toHaveBeenCalled();
  });

  it("lançamento de nota é delegado ao serviço que valida o vínculo com a turma", async () => {
    const response = await POST(
      new Request("https://localhost/api/grades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enrollmentId: "22222222-2222-4222-8222-222222222222",
          value: 8.5,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(setGrade).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), {
      enrollmentId: "22222222-2222-4222-8222-222222222222",
      value: 8.5,
    });
  });
});
