import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/app/lib/db";
import { sendEmail } from "@/app/lib/email";
import { passwordResetEmail } from "@/app/lib/email/templates";

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret && secret !== "replace-with-a-secure-secret") return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET não configurada");
  }
  // Valor apenas para desenvolvimento local e testes; nunca usado em produção.
  return "desenvolvimento-apenas-nao-usar-em-producao-000000";
}

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

export const auth = betterAuth({
  appName: "Sistema Acadêmico",
  baseURL: baseUrl(),
  secret: authSecret(),
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: [baseUrl()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        passwordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl: url,
          validMinutes: 30,
        }),
      );
    },
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
            select: { status: true, lockedUntil: true },
          });
          if (user?.status !== "ACTIVE") return false;
          if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return false;
          return true;
        },
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: "Sistema Acadêmico",
      totpOptions: {
        digits: 6,
        period: 30,
      },
    }),
  ],
});

export type Auth = typeof auth;
