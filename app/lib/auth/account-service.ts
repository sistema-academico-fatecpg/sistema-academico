import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { db } from "@/app/lib/db";
import { sendEmail } from "@/app/lib/email";
import { accountActivationEmail, passwordResetEmail } from "@/app/lib/email/templates";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import { RoleRepository } from "@/app/repositories/role.repository";
import { UserRepository, type UserWithRoles } from "@/app/repositories/user.repository";
import type { RoleName, UserId } from "@/app/types/common";
import type { UserInput } from "@/app/types/user";
import { setUserPassword } from "./credentials";
import { AuthError, forbidden, invalidToken, notFound, validationError } from "./errors";
import { validatePassword } from "./password-policy";
import { TokenService } from "./tokens";

const ADMIN_ROLES: readonly RoleName[] = ["ADMIN_MASTER", "ADMIN_SECUNDARIO"];
const SECONDARY_CREATABLE: readonly RoleName[] = ["PROFESSOR", "ALUNO"];

function auditUserId(value: string | null | undefined): UserId | null {
  return (value ?? null) as UserId | null;
}

export type ActorContext = {
  actorId: string | null;
  actorRoles: readonly RoleName[];
  ipAddress: string;
};

export type CreateUserResult =
  | { kind: "CREATED"; user: UserWithRoles }
  | { kind: "ROLE_ADDED"; user: UserWithRoles }
  | { kind: "PENDING_APPROVAL"; requestId: string };

export function appBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function activationUrl(token: string): string {
  return `${appBaseUrl()}/ativar?token=${encodeURIComponent(token)}`;
}

export function passwordResetUrl(token: string): string {
  return `${appBaseUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

function rolesOf(user: UserWithRoles): RoleName[] {
  return user.roles.map((userRole) => userRole.role.name);
}

/**
 * Regras de atribuição de perfil (seções 7.1, 8.2.3 e 7.5.4):
 * - Admin Secundário cadastra apenas alunos e professores;
 * - Admin Master cadastra os demais perfis;
 * - perfis administrativos exigem dupla aprovação.
 */
export function assertCanAssignRole(actor: ActorContext, role: RoleName): void {
  if (ADMIN_ROLES.includes(role)) {
    if (!actor.actorRoles.includes("ADMIN_MASTER")) {
      throw forbidden("Somente o Admin Master pode atribuir perfis administrativos");
    }
    return;
  }
  if (actor.actorRoles.includes("ADMIN_MASTER")) return;
  if (actor.actorRoles.includes("ADMIN_SECUNDARIO") && SECONDARY_CREATABLE.includes(role)) return;
  throw forbidden("Seu perfil não pode atribuir este perfil");
}

export function roleRequiresApproval(role: RoleName): boolean {
  return ADMIN_ROLES.includes(role);
}

async function assertNotLastMaster(target: UserWithRoles): Promise<void> {
  if (!rolesOf(target).includes("ADMIN_MASTER")) return;
  const activeMasters = await new UserRepository().countActiveMasters();
  if (activeMasters <= 1) {
    throw validationError(
      "Não é possível desativar a última conta Admin Master ativa (seção 8.1.4)",
    );
  }
}

export class AccountService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly roles = new RoleRepository(),
    private readonly tokens = new TokenService(),
    private readonly criticalOperations = new CriticalOperationRequestRepository(),
    private readonly audit = createAuditService(),
  ) {}

  /**
   * POST /users — endpoint único de cadastro, sem senha. O titular define a
   * própria senha pelo link de ativação (seções 8.2 e 8.3.1).
   */
  async createUser(input: UserInput, actor: ActorContext): Promise<CreateUserResult> {
    assertCanAssignRole(actor, input.role);

    const existing = await this.users.findByEmail(input.email);

    if (roleRequiresApproval(input.role)) {
      const request = await this.criticalOperations.create(actor.actorId ?? "", {
        operation:
          input.role === "ADMIN_MASTER"
            ? "INCLUDE_OR_REPLACE_ADMIN_MASTER"
            : "GRANT_REVOKE_ADMIN_PERMISSION",
        module: "USERS",
        recordType: "User",
        recordId: existing?.id,
        reason: `Cadastro de usuário com perfil ${input.role}`,
        payload: existing
          ? { action: "ADD_ROLE", userId: existing.id, role: input.role }
          : { action: "CREATE_USER", user: input },
      });

      await this.audit.record({
        userId: auditUserId(actor.actorId),
        role: actor.actorRoles[0] ?? null,
        ipAddress: actor.ipAddress,
        action: AUDIT_ACTIONS.CRITICAL_OPERATION_REQUESTED,
        module: "USERS",
        recordType: "User",
        recordId: existing?.id ?? null,
        result: "SUCCESS",
        newValue: { operation: request.operation, role: input.role, email: input.email },
      });

      return { kind: "PENDING_APPROVAL", requestId: request.id };
    }

    if (existing) {
      const alreadyHasRole = rolesOf(existing).includes(input.role);
      if (!alreadyHasRole) {
        const role = await this.roles.findByName(input.role);
        if (!role) throw notFound("Perfil não encontrado");
        await this.roles.assignRole(existing.id, role.id, actor.actorId);
        await this.audit.record({
          userId: auditUserId(actor.actorId),
          role: actor.actorRoles[0] ?? null,
          ipAddress: actor.ipAddress,
          action: AUDIT_ACTIONS.ROLE_ASSIGNED,
          module: "USERS",
          recordType: "User",
          recordId: existing.id,
          result: "SUCCESS",
          newValue: { role: input.role },
        });
      }
      if (existing.status === "PENDING_ACTIVATION") {
        await this.sendActivation(existing, actor.ipAddress);
      }
      return { kind: "ROLE_ADDED", user: existing };
    }

    const user = await this.users.create({ ...input, createdBy: actor.actorId });

    let activationSent = true;
    try {
      await this.sendActivation(user, actor.ipAddress);
    } catch {
      // O cadastro é preservado; a secretaria pode reenviar o link.
      activationSent = false;
    }

    await this.audit.record({
      userId: auditUserId(actor.actorId),
      role: actor.actorRoles[0] ?? null,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.ACCOUNT_CREATED,
      module: "USERS",
      recordType: "User",
      recordId: user.id,
      result: "SUCCESS",
      newValue: { name: user.name, email: user.email, role: input.role, activationSent },
    });

    return { kind: "CREATED", user };
  }

  async sendActivation(user: UserWithRoles, ipAddress: string, resent = false): Promise<void> {
    const issued = await this.tokens.issue(user.id, "ACCOUNT_ACTIVATION");
    await sendEmail(
      accountActivationEmail({
        to: user.email,
        name: user.name,
        activationUrl: activationUrl(issued.token),
        code: issued.code,
        validHours: 24,
      }),
    );
    if (resent) {
      await this.audit.record({
        userId: auditUserId(user.id),
        role: rolesOf(user)[0] ?? null,
        ipAddress,
        action: AUDIT_ACTIONS.ACCOUNT_ACTIVATION_RESENT,
        module: "USERS",
        recordType: "User",
        recordId: user.id,
        result: "SUCCESS",
      });
    }
  }

  async resendActivation(userId: string, actor: ActorContext): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw notFound("Usuário não encontrado");
    if (user.status !== "PENDING_ACTIVATION") {
      throw validationError("A conta não está pendente de ativação");
    }
    await this.sendActivation(user, actor.ipAddress, true);
  }

  /**
   * Ativação da conta: valida link (24h) e código (10 min), aplica a política
   * de senhas e grava apenas o hash. O link é consumido uma única vez.
   */
  async activate(input: {
    token: string;
    code: string;
    password: string;
    ipAddress: string;
  }): Promise<UserWithRoles> {
    const record = await this.tokens.peek(input.token, "ACCOUNT_ACTIVATION");
    if (!record) throw invalidToken();

    const user = await this.users.findById(record.userId);
    if (!user) throw invalidToken();
    if (user.status !== "PENDING_ACTIVATION") {
      throw new AuthError("Conta já ativada ou indisponível", "ACCOUNT_NOT_ACTIVE", 409);
    }

    const policy = validatePassword({
      password: input.password,
      name: user.name,
      registrationNumber: user.registrationNumber,
      roles: rolesOf(user),
    });
    if (!policy.valid) throw validationError("Senha não atende à política", policy.reasons);

    const codeValid = await this.tokens.verifyConfirmationCode(user.id, input.code);
    if (!codeValid) throw invalidToken("Código de confirmação inválido ou expirado");

    const consumed = await this.tokens.consume(input.token, "ACCOUNT_ACTIVATION");
    if (!consumed) throw invalidToken();
    await this.tokens.consumeConfirmationCode(user.id, input.code);

    await setUserPassword(user.id, input.password);
    const activated = await this.users.update(user.id, {
      status: "ACTIVE",
      emailVerified: true,
      lastLoginAt: new Date(),
    });

    await this.audit.record({
      userId: auditUserId(user.id),
      role: rolesOf(user)[0] ?? null,
      ipAddress: input.ipAddress,
      action: AUDIT_ACTIONS.ACCOUNT_ACTIVATED,
      module: "USERS",
      recordType: "User",
      recordId: user.id,
      result: "SUCCESS",
    });

    return activated;
  }

  /** Solicita redefinição por link de uso único (30 min), sem revelar se a conta existe. */
  async requestPasswordReset(email: string, ipAddress: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user?.status !== "ACTIVE") return;
    const issued = await this.tokens.issue(user.id, "PASSWORD_RESET");
    await sendEmail(
      passwordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: passwordResetUrl(issued.token),
        validMinutes: 30,
      }),
    );
    await this.audit.record({
      userId: auditUserId(user.id),
      role: rolesOf(user)[0] ?? null,
      ipAddress,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      module: "USERS",
      recordType: "User",
      recordId: user.id,
      result: "SUCCESS",
    });
  }

  async resetPassword(input: {
    token: string;
    password: string;
    ipAddress: string;
  }): Promise<UserWithRoles> {
    const record = await this.tokens.peek(input.token, "PASSWORD_RESET");
    if (!record) throw invalidToken();
    const user = await this.users.findById(record.userId);
    if (user?.status !== "ACTIVE") throw invalidToken();

    const policy = validatePassword({
      password: input.password,
      name: user.name,
      registrationNumber: user.registrationNumber,
      roles: rolesOf(user),
    });
    if (!policy.valid) throw validationError("Senha não atende à política", policy.reasons);

    const consumed = await this.tokens.consume(input.token, "PASSWORD_RESET");
    if (!consumed) throw invalidToken();

    await setUserPassword(user.id, input.password);
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    await this.audit.record({
      userId: auditUserId(user.id),
      role: rolesOf(user)[0] ?? null,
      ipAddress: input.ipAddress,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      module: "USERS",
      recordType: "User",
      recordId: user.id,
      result: "SUCCESS",
    });

    const refreshed = await this.users.findById(user.id);
    return refreshed ?? user;
  }

  async block(userId: string, reason: string, actor: ActorContext): Promise<void> {
    const target = await this.users.findById(userId);
    if (!target) throw notFound("Usuário não encontrado");
    await assertNotLastMaster(target);
    await this.users.block(userId, actor.actorId ?? "system", reason);
    await this.audit.record({
      userId: auditUserId(actor.actorId),
      role: actor.actorRoles[0] ?? null,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.ACCOUNT_BLOCKED,
      module: "USERS",
      recordType: "User",
      recordId: userId,
      result: "SUCCESS",
      newValue: { reason },
    });
  }

  async deactivate(userId: string, actor: ActorContext): Promise<void> {
    const target = await this.users.findById(userId);
    if (!target) throw notFound("Usuário não encontrado");
    await assertNotLastMaster(target);
    await this.users.deactivate(userId, actor.actorId ?? "system");
    await this.users.revokeSessions(userId);
    await this.tokens.invalidateForUser(userId);
    await this.audit.record({
      userId: auditUserId(actor.actorId),
      role: actor.actorRoles[0] ?? null,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.ACCOUNT_DEACTIVATED,
      module: "USERS",
      recordType: "User",
      recordId: userId,
      result: "SUCCESS",
    });
  }
}

export function visibleRolesFor(actorRoles: readonly RoleName[]): RoleName[] {
  if (actorRoles.includes("ADMIN_MASTER")) {
    return ["ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"];
  }
  if (actorRoles.includes("ADMIN_SECUNDARIO")) return ["PROFESSOR", "ALUNO"];
  if (actorRoles.includes("AUDITOR")) return ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "AUDITOR"];
  return [];
}
