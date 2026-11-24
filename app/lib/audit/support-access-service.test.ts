import { describe, expect, it, vi } from "vitest";
import { AUDIT_ACTIONS } from "./audit-service";
import { SupportAccessService } from "./support-access-service";

const actor = {
  id: "support-1",
  roles: ["SUPORTE_TECNICO"],
  ipAddress: "127.0.0.1",
};

function deps(overrides: { activeGrant?: unknown; grant?: unknown; expire?: unknown } = {}) {
  const grants = {
    create: vi.fn(async () => ({ id: "grant-1" })),
    findById: vi.fn(async () => overrides.grant ?? null),
    decide: vi.fn(async (_id: string, status: string) => ({ id: "grant-1", status })),
    expireDue: vi.fn(async () => overrides.expire ?? { count: 0 }),
    findActiveForUser: vi.fn(async () => overrides.activeGrant ?? null),
  };
  const audit = { record: vi.fn(async () => ({})) };
  const service = new SupportAccessService(grants as never, audit as never);
  return { service, grants, audit };
}

describe("acesso excepcional aos logs (10.8)", () => {
  const valid = {
    reason: "Investigação de falha de autenticação",
    modules: ["AUDIT_LOGS" as const],
    endsAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    involvesAuditor: false,
  };

  it("limita o acesso a 8 horas", async () => {
    const { service } = deps();
    await expect(
      service.request(actor, {
        ...valid,
        endsAt: new Date(Date.now() + 9 * 3_600_000).toISOString(),
      }),
    ).rejects.toThrow(/8 horas/);
  });

  it("exige autorização da direção quando a investigação envolve o Auditor", async () => {
    const { service } = deps();
    await expect(service.request(actor, { ...valid, involvesAuditor: true })).rejects.toThrow(
      /autorização formal da direção/,
    );
  });

  it("nega leitura sem concessão ativa no escopo", async () => {
    const { service } = deps({ activeGrant: null });
    await expect(service.assertCanRead(actor, "AUDIT_LOGS")).rejects.toThrow(
      /expirado ou fora do escopo/,
    );
  });

  it("registra cada consulta realizada por suporte", async () => {
    const { service, audit } = deps({
      activeGrant: {
        id: "grant-1",
        modules: [{ module: "AUDIT_LOGS", canRead: true }],
      },
    });
    await service.assertCanRead(actor, "AUDIT_LOGS");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.SUPPORT_ACCESS_CONSULTED,
        module: "AUDIT_LOGS",
      }),
    );
  });

  it("exige autorização da direção para aprovar investigação do Auditor", async () => {
    const { service } = deps({
      grant: {
        id: "grant-1",
        status: "PENDING",
        requestedBy: "support-1",
        involvesAuditor: true,
        authorizationDocument: "Ofício 7/2026",
        modules: [{ module: "AUDIT_LOGS" }],
      },
    });
    const auditor = { ...actor, id: "auditor-1", roles: ["AUDITOR"] };
    await expect(service.decide("grant-1", "APPROVE", auditor, "documento errado")).rejects.toThrow(
      /autorização formal da direção/,
    );
    await expect(service.decide("grant-1", "APPROVE", auditor, "Ofício 7/2026")).resolves.toEqual(
      expect.objectContaining({ status: "APPROVED" }),
    );
  });
});
