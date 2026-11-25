import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { getClientIp } from "@/app/lib/request-context";
import { UserRepository, type UserWithRoles } from "@/app/repositories/user.repository";
import type { RoleName } from "@/app/types/common";
import { auth } from "./better-auth";
import { AuthError } from "./errors";

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;

const GENERIC_CREDENTIALS_MESSAGE = "Credenciais inválidas.";

function rolesOf(user: UserWithRoles): RoleName[] {
  return user.roles.map((userRole) => userRole.role.name as RoleName);
}

function copyCookies(from: Response, to: Response): void {
  for (const cookie of from.headers.getSetCookie()) {
    to.headers.append("set-cookie", cookie);
  }
}

/**
 * Login individual (seção 8.4) com bloqueio de 5 tentativas por 15 minutos.
 *
 * A mensagem devolvida é sempre genérica para não revelar se o e-mail existe
 * (seção 8.4.5). O Better Auth continua responsável pela senha Argon2id, pelo
 * segundo fator e pela criação da sessão.
 */
export async function loginWithPassword(input: {
  email: string;
  password: string;
  request: Request;
}): Promise<Response> {
  const users = new UserRepository();
  const audit = createAuditService();
  const ipAddress = getClientIp(input.request);
  const email = input.email.toLowerCase();
  const user = await users.findByEmail(email);

  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await audit.record({
      userId: user.id as never,
      role: rolesOf(user)[0] ?? null,
      ipAddress,
      action: AUDIT_ACTIONS.LOGIN_BLOCKED,
      module: "USERS",
      recordType: "User",
      recordId: user.id,
      result: "FAILURE",
      newValue: { reason: "ACCOUNT_TEMPORARILY_LOCKED" },
    });
    throw new AuthError(GENERIC_CREDENTIALS_MESSAGE, "UNAUTHENTICATED", 401);
  }

  if (user && user.status !== "ACTIVE") {
    await audit.record({
      userId: user.id as never,
      role: rolesOf(user)[0] ?? null,
      ipAddress,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      module: "USERS",
      recordType: "User",
      recordId: user.id,
      result: "FAILURE",
      newValue: { reason: "ACCOUNT_NOT_ACTIVE" },
    });
    throw new AuthError(GENERIC_CREDENTIALS_MESSAGE, "UNAUTHENTICATED", 401);
  }

  const upstream = await (
    auth.api as unknown as {
      signInEmail: (options: {
        body: { email: string; password: string };
        headers: Headers;
        asResponse: true;
      }) => Promise<Response>;
    }
  ).signInEmail({
    body: { email, password: input.password },
    headers: input.request.headers,
    asResponse: true,
  });

  if (!upstream.ok) {
    if (user) {
      const updated = await users.registerFailedLogin(
        user.id,
        MAX_LOGIN_ATTEMPTS,
        LOGIN_LOCK_MINUTES,
      );

      await audit.record({
        userId: user.id as never,
        role: rolesOf(user)[0] ?? null,
        ipAddress,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        module: "USERS",
        recordType: "User",
        recordId: user.id,
        result: "FAILURE",
      });

      if (updated?.lockedUntil && updated.lockedUntil.getTime() > Date.now()) {
        await audit.record({
          userId: user.id as never,
          role: rolesOf(user)[0] ?? null,
          ipAddress,
          action: AUDIT_ACTIONS.LOGIN_BLOCKED,
          module: "USERS",
          recordType: "User",
          recordId: user.id,
          result: "FAILURE",
          newValue: { lockMinutes: LOGIN_LOCK_MINUTES },
        });
        await audit.raiseAlert(
          "LOGIN_FAILURE_SEQUENCE",
          {
            ipAddress,
            action: AUDIT_ACTIONS.LOGIN_BLOCKED,
            module: "USERS",
            result: "FAILURE",
            userId: user.id as never,
            recordType: "User",
            recordId: user.id,
          },
          undefined,
        );
      }
    } else {
      await audit.record({
        userId: null,
        role: null,
        ipAddress,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        module: "USERS",
        result: "FAILURE",
      });
    }

    throw new AuthError(GENERIC_CREDENTIALS_MESSAGE, "UNAUTHENTICATED", 401);
  }

  const payload = (await upstream.json()) as Record<string, unknown>;
  const response = new Response(JSON.stringify(payload), {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
  copyCookies(upstream, response);
  return response;
}
