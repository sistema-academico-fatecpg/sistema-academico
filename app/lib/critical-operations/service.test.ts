import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { CriticalOperationRequestWithUsers } from "@/app/repositories/critical-operation-request.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { CriticalOperationService } from "./service";

const h = vi.hoisted(() => {
  const tx = {
    criticalOperationRequest: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({})),
      findUniqueOrThrow: vi.fn(async () => ({})),
    },
    log: { create: vi.fn(async () => ({ id: "log-1" })) },
    auditAlert: { create: vi.fn(async () => ({ id: "alert-1" })) },
    user: { findUnique: vi.fn(async () => ({ isEmergency: false })) },
  };
  return {
    tx,
    withTransaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(tx)),
  };
});

vi.mock("@/app/lib/db", () => ({
  withTransaction: h.withTransaction,
  db: {},
}));

const requestId = randomUUID();
const masterA = randomUUID();
const masterB = randomUUID();
const auditor = randomUUID();

type RequestOverrides = Partial<CriticalOperationRequestWithUsers>;

function pending(overrides: RequestOverrides = {}): CriticalOperationRequestWithUsers {
  return {
    id: requestId,
    requestedBy: masterA,
    approvedBy: null,
    operation: "GRANT_REVOKE_ADMIN_PERMISSION",
    module: "USERS",
    recordType: "User",
    recordId: null,
    reason: "Justificativa com mais de dez caracteres",
    payload: {
      action: "ADD_ROLE",
      userId: masterB,
      role: "ADMIN_SECUNDARIO",
    },
    authorizationDocument: null,
    status: "PENDING",
    decisionReason: null,
    requestedAt: new Date(),
    decidedAt: null,
    executedAt: null,
    requester: {} as never,
    approver: null,
    ...overrides,
  } as CriticalOperationRequestWithUsers;
}

function deps(
  options: {
    activeMasters?: number;
    activeAuditors?: number;
    request?: CriticalOperationRequestWithUsers;
    execute?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
    record?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const requests = {
    findById: vi.fn(async () => options.request ?? pending()),
    create: options.create ?? vi.fn(async () => ({ id: requestId })),
  };
  const users = {
    countActiveMasters: vi.fn(async () => options.activeMasters ?? 2),
    countActiveAuditors: vi.fn(async () => options.activeAuditors ?? 2),
  };
  const audit = { record: options.record ?? vi.fn(async () => ({})) };
  const executor = {
    execute: options.execute ?? vi.fn(async () => ({ summary: "executado" })),
  };
  const logs = {
    findEarliestUnacknowledgedAlert: vi.fn(async () => null),
  };
  const service = new CriticalOperationService(
    requests as never,
    users as never,
    audit as never,
    executor as never,
    logs as never,
  );
  return { service, requests, users, audit, executor };
}

function actor(
  overrides: {
    id?: string;
    roles?: ("ADMIN_MASTER" | "AUDITOR" | "ADMIN_SECUNDARIO")[];
    permissions?: Set<string>;
  } = {},
) {
  return {
    id: overrides.id ?? masterB,
    roles: overrides.roles ?? ["ADMIN_MASTER"],
    ipAddress: "127.0.0.1",
    permissions: (overrides.permissions ?? new Set([PERMISSIONS.ROLES_UPDATE])) as never,
  };
}

const adminPermissionInput = {
  operation: "GRANT_REVOKE_ADMIN_PERMISSION" as const,
  module: "USERS" as const,
  reason: "Justificativa com mais de dez caracteres",
  payload: {
    action: "ADD_ROLE",
    userId: masterB,
    role: "ADMIN_SECUNDARIO",
  },
};

describe("fluxo de dupla aprovação (7.5, 7.6 e 8.8)", () => {
  it("suspende operações críticas em modo de conta única", async () => {
    const { service, requests } = deps({ activeMasters: 1 });

    await expect(service.request(actor(), adminPermissionInput)).rejects.toThrow(
      /Modo de conta única/,
    );
    expect(requests.create).not.toHaveBeenCalled();
  });

  it("permite somente a inclusão de Master em modo de conta única", async () => {
    const create = vi.fn(async () => ({ id: requestId }));
    const { service, requests } = deps({
      activeMasters: 1,
      create,
      request: pending(),
    });
    requests.findById.mockResolvedValueOnce(pending());

    await service.request(actor({ permissions: new Set([PERMISSIONS.ROLES_CREATE]) }), {
      operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER",
      reason: "Substituição de coordenador autorizada pela direção",
      authorizationDocument: "Ofício 9/2026",
      payload: {
        action: "CREATE_USER",
        user: { name: "Nova Coordenação", email: "nova@academico.com", role: "ADMIN_MASTER" },
      },
    });

    expect(create).toHaveBeenCalled();
  });

  it("bloqueia a autoaprovação e registra o alerta", async () => {
    const record = vi.fn(async () => ({}));
    const { service } = deps({
      activeMasters: 2,
      request: pending({ requestedBy: masterB }),
      record,
    });

    await expect(
      service.decide(requestId, { decision: "APPROVE" }, actor({ id: masterB })),
    ).rejects.toThrow(/não pode aprovar a própria/);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SELF_APPROVAL_ATTEMPT", result: "FAILURE" }),
    );
  });

  it("em modo de conta única, a aprovação de Master cabe ao Auditor", async () => {
    const execute = vi.fn(async () => ({ summary: "Master incluído" }));
    const { service } = deps({
      activeMasters: 1,
      request: pending({ operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER" }),
      execute,
    });
    h.tx.criticalOperationRequest.update.mockResolvedValueOnce({ status: "EXECUTED" } as never);

    const approved = await service.decide(
      requestId,
      { decision: "APPROVE" },
      actor({ id: auditor, roles: ["AUDITOR"], permissions: new Set([PERMISSIONS.ROLES_APPROVE]) }),
    );

    expect(execute).toHaveBeenCalled();
    expect(approved.executed).toBe(true);
    expect(h.tx.criticalOperationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "EXECUTED" }) }),
    );
  });

  it("rejeita aprovação de Admin Master em modo de conta única", async () => {
    const { service } = deps({
      activeMasters: 1,
      request: pending({ operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER" }),
    });

    await expect(
      service.decide(requestId, { decision: "APPROVE" }, actor({ id: masterB })),
    ).rejects.toThrow(/aprovação cabe ao Auditor/);
  });

  it("fora do modo de conta única, a aprovação é de outro Admin Master", async () => {
    const execute = vi.fn(async () => ({ summary: "Perfil concedido" }));
    const { service } = deps({
      activeMasters: 2,
      request: pending(),
      execute,
    });
    h.tx.criticalOperationRequest.update.mockResolvedValueOnce({ status: "EXECUTED" } as never);

    const result = await service.decide(requestId, { decision: "APPROVE" }, actor({ id: masterB }));
    expect(result.executed).toBe(true);
  });

  it("não suspende a redefinição de segundo fator em modo de conta única", async () => {
    const create = vi.fn(async () => ({ id: requestId }));
    const { service } = deps({ activeMasters: 1, create });

    await service.request(actor({ permissions: new Set([PERMISSIONS.USERS_UPDATE]) }), {
      operation: "RESET_SECOND_FACTOR",
      module: "USERS",
      reason: "Identificação presencial registrada pela secretaria",
      payload: { userId: masterA },
    });

    expect(create).toHaveBeenCalled();
  });

  it("impede que o próprio titular aprove a redefinição do seu segundo fator", async () => {
    const { service } = deps({
      activeMasters: 2,
      request: pending({
        operation: "RESET_SECOND_FACTOR",
        payload: { userId: masterB },
      }),
    });

    await expect(
      service.decide(requestId, { decision: "APPROVE" }, actor({ id: masterB })),
    ).rejects.toThrow(/outro Admin Master/);
  });

  it("cria solicitação de Master emergencial somente sem Masters ativos", async () => {
    const create = vi.fn(async () => ({ id: requestId }));
    const { service } = deps({
      activeMasters: 0,
      activeAuditors: 2,
      create,
      request: pending({ operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER" }),
    });

    await service.requestEmergencyMaster({
      name: "Coordenação Emergencial",
      email: "emergencial@academico.com",
      authorizationDocument: "Ofício 42/2026 da direção",
      requestedByAuditorId: auditor,
      ipAddress: "127.0.0.1",
    });

    expect(create).toHaveBeenCalledWith(
      auditor,
      expect.objectContaining({
        operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER",
        authorizationDocument: "Ofício 42/2026 da direção",
        payload: expect.objectContaining({ emergency: true }),
      }),
    );
  });

  it("recusa conta emergencial quando ainda existe Admin Master ativo", async () => {
    const { service } = deps({ activeMasters: 1, activeAuditors: 2 });

    await expect(
      service.requestEmergencyMaster({
        name: "Coordenação Emergencial",
        email: "emergencial@academico.com",
        authorizationDocument: "Ofício 42/2026 da direção",
        requestedByAuditorId: auditor,
        ipAddress: "127.0.0.1",
      }),
    ).rejects.toThrow(/não há Admin Master ativo/);
  });

  it("exige autorização da direção para incluir Master em modo de conta única", async () => {
    const { service, requests } = deps({ activeMasters: 1 });
    await expect(
      service.request(actor({ permissions: new Set([PERMISSIONS.ROLES_CREATE]) }), {
        operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER",
        reason: "Substituição de coordenador com documento anexo",
        payload: {
          action: "CREATE_USER",
          user: {
            name: "Nova Coordenação",
            email: "nova@academico.com",
            role: "ADMIN_MASTER",
          },
        },
      }),
    ).rejects.toThrow(/autorização da direção/);
    expect(requests.create).not.toHaveBeenCalled();
  });

  it("aceita inclusão de Master em conta única com documento da direção", async () => {
    const create = vi.fn(async () => ({ id: requestId }));
    const { service } = deps({ activeMasters: 1, create });
    await service.request(actor({ permissions: new Set([PERMISSIONS.ROLES_CREATE]) }), {
      operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER",
      reason: "Substituição de coordenador com documento anexo",
      authorizationDocument: "Ofício 12/2026",
      payload: {
        action: "CREATE_USER",
        user: {
          name: "Nova Coordenação",
          email: "nova@academico.com",
          role: "ADMIN_MASTER",
        },
      },
    });
    expect(create).toHaveBeenCalled();
  });

  it("recusa aprovar reset de segundo fator sem identificação presencial", async () => {
    const { service } = deps({
      activeMasters: 2,
      request: pending({
        operation: "RESET_SECOND_FACTOR",
        payload: { userId: masterA },
      }),
    });
    await expect(
      service.decide(requestId, { decision: "APPROVE" }, actor({ id: masterB })),
    ).rejects.toThrow(/identificação presencial/);
  });

  it("aprova reset de segundo fator com identificação presencial registrada", async () => {
    const execute = vi.fn(async () => ({ summary: "segundo fator redefinido" }));
    const { service } = deps({
      activeMasters: 2,
      request: pending({
        operation: "RESET_SECOND_FACTOR",
        payload: {
          userId: masterA,
          identityVerifiedAt: "2026-11-25T10:00:00.000Z",
        },
      }),
      execute,
    });
    h.tx.criticalOperationRequest.update.mockResolvedValueOnce({ status: "EXECUTED" } as never);
    const result = await service.decide(requestId, { decision: "APPROVE" }, actor({ id: masterB }));
    expect(result.executed).toBe(true);
  });
});
