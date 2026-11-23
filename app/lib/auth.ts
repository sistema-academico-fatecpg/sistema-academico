import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      institutionalEmail: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "ALUNO",
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "PENDING_ACTIVATION",
      },
      registrationNumber: {
        type: "string",
        required: false,
      },
      mfaEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      mfaSecret: {
        type: "string",
        required: false,
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, token }) => {
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: user.email,
        subject: "Ative sua conta - Sistema Acadêmico",
        text: `Clique no link para ativar sua conta: ${process.env.BETTER_AUTH_URL}/activate-email?token=${token}`,
        html: `
          <h1>Ative sua conta</h1>
          <p>Clique no link abaixo para ativar sua conta:</p>
          <a href="${process.env.BETTER_AUTH_URL}/activate-email?token=${token}">Ativar conta</a>
          <p>Este link expira em 24 horas.</p>
        `,
      });
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  advanced: {
    databasePrefix: "",
    generateId: async () => {
      return crypto.randomUUID();
    },
  },
  logger: {
    level: process.env.NODE_ENV === "development" ? "debug" : "error",
  },
});

export type AuthUser = typeof auth extends {
  user: infer U;
}
  ? U
  : never;
