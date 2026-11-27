import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { db } from "@/app/lib/db";
import { sendEmail } from "@/app/lib/email";
import { passwordResetEmail } from "@/app/lib/email/templates";
import { RoleRepository } from "@/app/repositories/role.repository";
import { UserRepository, type UserWithRoles } from "@/app/repositories/user.repository";
import type { RoleName, UserId } from "@/app/types/common";
import type { UserInput } from "@/app/types/user";
import { deliverActivation, passwordResetUrl } from "./activation";
import { setUserPassword } from "./credentials";
import { AuthError, forbidden, invalidToken, notFound, validationError } from "./errors";
import { validatePassword } from "./password-policy";
import { TokenService } from "./tokens";

const ADMIN_ROLES: readonly string[] = ["ADMIN_MASTER", "ADMIN_SECUNDARIO"];
const SECONDARY_CREATABLE: readonly string[] = ["PROFESSOR", "ALUNO"];

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

function rolesOf(user: UserWithRoles): RoleName[] {
  return user.roles.map((userRole) => userRole.role.name as RoleName);
}

/**
 * Regras de atribuição de perfil (seções 7.1, 8.2.3 e 7.5.4):
 * - Admin Secundário cadastra apenas alunos e professores;
 * - Admin Master cadastra os demais perfis;
 * - perfis administrativos exigem dupla aprovação.
 */
export function assertCanAssignRole(actor: ActorContext, role: string): void {
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

export function roleRequiresApproval(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

export class AccountService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly roles = new RoleRepository(),
    private readonly tokens = new TokenService(),
    private readonly criticalOperations = new CriticalOperationService(),
    private readonly audit = createAuditService(),
  ) {}

  /**
   * POST /users — endpoint único de cadastro, sem senha. O titular define a
   * própria senha pelo link de ativação (seções 8.2 e 8.3.1).
   */
  async createUser(
    input: UserInput,
    actor: ActorContext,
    requestReason?: string,
    authorizationDocument?: string,
  ): Promise<CreateUserResult> {
    assertCanAssignRole(actor, input.role);
    if (!actor.actorId) throw forbidden("Sessão sem usuário identificado");

    // O institucional é gerado a cada cadastro; o e-mail pessoal identifica a
    // pessoa quando ela já tem conta (evita duplicar o mesmo titular).
    const existing =
      (await this.users.findByEmail(input.email)) ??
      (input.personalEmail ? await this.users.findByEmail(input.personalEmail) : null);

    if (roleRequiresApproval(input.role)) {
      const reason = requestReason?.trim();
      if (!reason || reason.length < 10) {
        throw validationError(
          "Justificativa obrigatória (mínimo de 10 caracteres) para cadastro com perfil administrativo",
        );
      }

      const request = await this.criticalOperations.request(
        {
          id: actor.actorId,
          roles: actor.actorRoles,
          ipAddress: actor.ipAddress,
        },
        {
          operation:
            input.role === "ADMIN_MASTER"
              ? "INCLUDE_OR_REPLACE_ADMIN_MASTER"
              : "GRANT_REVOKE_ADMIN_PERMISSION",
          module: "USERS",
          recordType: "User",
          recordId: existing?.id,
          reason,
          ...(authorizationDocument ? { authorizationDocument } : {}),
          payload: existing
            ? { action: "ADD_ROLE", userId: existing.id, role: input.role }
            : { action: "CREATE_USER", user: input },
        },
      );

      return { kind: "PENDING_APPROVAL", requestId: request.id };
    }

    if (existing) {
      const alreadyHasRole = rolesOf(existing).includes(input.role as RoleName);
      if (!alreadyHasRole) {
        const role = await this.roles.findByName(input.role);
        if (!role) throw notFound("Perfil não encontrado");
        await this.roles.assignRole(existing.id, role.id, actor.actorId);
        await this.audit.record({
          ...auditActor(actor),
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
      // O cadastro é preservado; a secretaria deve cadastrar o e-mail pessoal
      // do titular (quando ausente) e então reenviar o link.
      activationSent = false;
    }

    await this.audit.record({
      ...auditActor(actor),
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
    await deliverActivation(user, this.tokens);
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

    // 8.8 (substituição de coordenador): a conta anterior é bloqueada
    // imediatamente após a ativação do novo Master, nunca antes.
    if (user.replacesUserId) {
      await this.users.block(
        user.replacesUserId,
        user.id,
        "Conta anterior bloqueada após ativação do novo coordenador (8.8)",
      );
      await this.audit.record({
        userId: auditUserId(user.id),
        role: "ADMIN_MASTER",
        ipAddress: input.ipAddress,
        action: AUDIT_ACTIONS.ACCOUNT_BLOCKED,
        module: "USERS",
        recordType: "User",
        recordId: user.replacesUserId,
        result: "SUCCESS",
        newValue: { reason: "SUBSTITUICAO_COORDENADOR" },
      });
    }

    return activated;
  }

  /**
   * Redefinição de senha é solicitada presencialmente pela secretaria (Admin
   * Secundário) na tela de usuários, nunca pelo próprio titular em uma tela de
   * "esqueci minha senha" (8.3/8.6). O link de uso único (30 min) e o código de
   * confirmação de 6 dígitos (8.4.3) são enviados somente ao e-mail pessoal real
   * do titular; o e-mail institucional é fictício e não possui caixa postal.
   */
  async requestPasswordResetBySecretariat(userId: string, actor: ActorContext): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw notFound("Usuário não encontrado");
    if (user.status !== "ACTIVE") {
      throw validationError("Somente contas ativas podem solicitar redefinição de senha");
    }

    const personalEmail = user.personalEmail?.trim().toLowerCase();
    if (!personalEmail) {
      throw validationError(
        "E-mail pessoal não cadastrado: não é possível enviar o link de redefinição de senha. Atualize o e-mail pessoal do titular antes de solicitar (seção 8.6).",
      );
    }

    const issued = await this.tokens.issue(user.id, "PASSWORD_RESET");
    await sendEmail(
      passwordResetEmail({
        to: personalEmail,
        name: user.name,
        resetUrl: passwordResetUrl(issued.token, issued.code),
        code: issued.code,
        validMinutes: 30,
      }),
    );
    await this.audit.record({
      ...auditActor(actor),
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      module: "USERS",
      recordType: "User",
      recordId: user.id,
      result: "SUCCESS",
      newValue: { requestedBySecretariat: true },
    });
  }

  /**
   * A redefinição exige o link de uso único e o código de 6 dígitos enviados ao
   * e-mail pessoal (8.4.3). O código é validado exatamente como na ativação.
   */
  async resetPassword(input: {
    token: string;
    code: string;
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

    const codeValid = await this.tokens.verifyConfirmationCode(user.id, input.code);
    if (!codeValid) throw invalidToken("Código de confirmação inválido ou expirado");

    const consumed = await this.tokens.consume(input.token, "PASSWORD_RESET");
    if (!consumed) throw invalidToken();
    await this.tokens.consumeConfirmationCode(user.id, input.code);

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
    // 8.7/8.8: bloqueio é imediato mesmo que reste apenas um Master ativo.
    // A restrição de "último Master" aplica-se apenas à revogação de perfil
    // (operação crítica), não ao bloqueio por desligamento.
    await this.users.block(userId, actor.actorId ?? "system", reason);
    await this.audit.record({
      ...auditActor(actor),
      action: AUDIT_ACTIONS.ACCOUNT_BLOCKED,
      module: "USERS",
      recordType: "User",
      recordId: userId,
      result: "SUCCESS",
      newValue: { reason },
    });
    await this.alertIfMastersBelowMinimum(actor);
  }

  async deactivate(userId: string, actor: ActorContext): Promise<void> {
    const target = await this.users.findById(userId);
    if (!target) throw notFound("Usuário não encontrado");
    // 8.7/8.8: desativação não é retardada pela quantidade de Masters ativos;
    // o modo de conta única é tratado pelo alerta abaixo.
    await this.users.deactivate(userId, actor.actorId ?? "system");
    await this.users.revokeSessions(userId);
    await this.tokens.invalidateForUser(userId);
    await this.audit.record({
      ...auditActor(actor),
      action: AUDIT_ACTIONS.ACCOUNT_DEACTIVATED,
      module: "USERS",
      recordType: "User",
      recordId: userId,
      result: "SUCCESS",
    });
    await this.alertIfMastersBelowMinimum(actor);
  }

  /**
   * Alerta a direção e o Auditor sempre que restarem menos de duas contas
   * Admin Master ativas (seções 8.1.2 e 8.8).
   */
  private async alertIfMastersBelowMinimum(actor: ActorContext): Promise<void> {
    const activeMasters = await this.users.countActiveMasters();
    if (activeMasters >= 2) return;
    await this.audit.record({
      ...auditActor(actor),
      action: AUDIT_ACTIONS.MASTER_ACCOUNTS_BELOW_MINIMUM,
      module: "USERS",
      recordType: "User",
      result: "SUCCESS",
      newValue: { activeMasters },
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
