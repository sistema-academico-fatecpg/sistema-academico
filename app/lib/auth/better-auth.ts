import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { withTotpClockSkew } from "@/app/lib/auth/totp-clock-skew";
import { withTotpDiagnostics } from "@/app/lib/auth/totp-diagnostics";
import { withSingleUseTotp } from "@/app/lib/auth/totp-single-use";
import { db } from "@/app/lib/db";
import { hashPassword, verifyPassword } from "@/app/lib/security/password-hash";
import { requiresMfa } from "@/app/types/roles";

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret && secret !== "replace-with-a-secure-secret") return secret;
  // A coleta de páginas durante o build não deve exigir segredos de runtime.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "build-time-placeholder-not-used-at-runtime";
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET não configurada");
  }
  return "desenvolvimento-apenas-nao-usar-em-producao-000000";
}

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

async function currentRoles(userId: string): Promise<string[]> {
  const roles = await db.userRole.findMany({
    where: { userId },
    select: { role: { select: { name: true } } },
  });
  return roles.map((item) => item.role.name);
}

export const auth = betterAuth({
  appName: "Sistema Acadêmico",
  baseURL: baseUrl(),
  secret: authSecret(),
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: [baseUrl()],
  emailAndPassword: {
    enabled: true,
    // Não existe autocadastro: a secretaria cria a conta e o titular a ativa
    // pelo link de uso único (seções 8.2 e 8.3).
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: hashPassword,
      verify: ({ hash, password }) => verifyPassword(hash, password),
    },
    // Não há hook de envio: a recuperação é presencial, solicitada pela
    // secretaria, e o link + código vão ao e-mail pessoal pelo AccountService
    // (8.6). Os endpoints self-service de senha do Better Auth são bloqueados
    // no handler catch-all; o e-mail institucional é fictício e nunca é usado
    // como destino de mensagens.
  },
  user: {
    modelName: "user",
    fields: {
      emailVerified: "emailVerified",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  session: {
    modelName: "session",
    // Limite máximo; perfis privilegiados têm inatividade reduzida para 15
    // minutos na verificação server-side (seção 8.5.1).
    expiresIn: 30 * 60,
    updateAge: 5 * 60,
    cookieCache: {
      enabled: false,
    },
  },
  account: {
    modelName: "account",
  },
  verification: {
    modelName: "verification",
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: {
              status: true,
              lockedUntil: true,
              isEmergency: true,
              emergencyExpiresAt: true,
            },
          });
          if (user?.status !== "ACTIVE") return false;
          if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return false;
          if (
            user.isEmergency &&
            user.emergencyExpiresAt &&
            user.emergencyExpiresAt.getTime() <= Date.now()
          ) {
            return false;
          }
          return true;
        },
        after: async (session) => {
          // Executado somente quando a sessão é realmente criada, ou seja,
          // depois da senha e, quando exigido, do segundo fator.
          try {
            const { UserRepository } = await import("@/app/repositories/user.repository");
            const { createAuditService } = await import("@/app/lib/audit");
            const { AUDIT_ACTIONS } = await import("@/app/lib/audit/audit-service");
            const roles = await currentRoles(session.userId);
            await new UserRepository().registerSuccessfulLogin(session.userId);
            await createAuditService().record({
              userId: session.userId as never,
              role: (roles[0] ?? null) as never,
              ipAddress: session.ipAddress ?? "unknown",
              action: AUDIT_ACTIONS.LOGIN_SUCCESS,
              module: "USERS",
              recordType: "User",
              recordId: session.userId,
              result: "SUCCESS",
            });
          } catch {
            // A auditoria nunca deve impedir uma sessão já autenticada.
          }
        },
      },
    },
  },
  plugins: [
    withTotpDiagnostics(
      withSingleUseTotp(
        withTotpClockSkew(
          twoFactor({
            issuer: "Sistema Acadêmico",
            // 8.9: limite de tentativas no segundo fator.
            accountLockout: {
              enabled: true,
              maxFailedAttempts: 5,
              durationSeconds: 15 * 60,
            },
            totpOptions: {
              digits: 6,
              period: 30,
            },
            backupCodeOptions: {
              amount: 10,
              length: 10,
              storeBackupCodes: "encrypted",
            },
          }),
        ),
      ),
    ),
  ],
});

/** Indica se o usuário precisa concluir a configuração do segundo fator. */
export async function needsTwoFactorSetup(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  if (!user) return false;
  const roles = (await currentRoles(userId)) as Parameters<typeof requiresMfa>[0];
  return requiresMfa(roles) && !user.twoFactorEnabled;
}

export type Auth = typeof auth;
