import { createHash } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { db } from "@/app/lib/db";
import { resolveTotpUserId, type TotpHookContext } from "./totp-user";

/** Registro de código usado: 5 minutos (cobre a janela TOTP de 30 s com folga). */
const USED_CODE_TTL_MS = 5 * 60_000;

const VERIFY_TOTP_PATH = "/two-factor/verify-totp";
const USED_KEY = Symbol("totp-used-code-key");

type MiddlewareContext = TotpHookContext & {
  body?: { code?: string };
  context: TotpHookContext["context"] & {
    returned?: { token?: unknown };
    [USED_KEY]?: string;
  };
};

function contextOf(ctx: unknown): MiddlewareContext {
  return ctx as MiddlewareContext;
}

function reusedCodeError(): APIError {
  return new APIError("BAD_REQUEST", {
    message: "Código de verificação inválido ou já utilizado",
    code: "TOTP_ALREADY_USED",
  });
}

/**
 * 8.4.2: "Cada código é aceito uma única vez".
 *
 * A checagem de reutilização acontece antes da validação do Better Auth, para
 * que um replay não chegue a criar uma nova sessão. O registro só é gravado
 * depois de uma validação bem-sucedida: um código digitado errado não é
 * descartado, evitando que a tentativa correta seguinte seja rejeitada.
 */
export function withSingleUseTotp(plugin: BetterAuthPlugin): BetterAuthPlugin {
  return {
    ...plugin,
    hooks: {
      ...(plugin.hooks ?? {}),
      before: [
        ...(plugin.hooks?.before ?? []),
        {
          matcher: (context) => context.path === VERIFY_TOTP_PATH,
          handler: createAuthMiddleware(async (rawCtx) => {
            const ctx = contextOf(rawCtx);
            const code = ctx.body?.code;
            if (typeof code !== "string" || code.length === 0) return;

            const userId = await resolveTotpUserId(ctx);
            if (!userId) return;
            const key = createHash("sha256").update(`${userId}|${code}`).digest("hex");
            ctx.context[USED_KEY] = key;

            const used = await db.totpUsedCode.findUnique({
              where: { key },
              select: { usedAt: true },
            });
            if (used && used.usedAt.getTime() > Date.now() - USED_CODE_TTL_MS) {
              throw reusedCodeError();
            }
          }),
        },
      ],
      after: [
        ...(plugin.hooks?.after ?? []),
        {
          matcher: (context) => context.path === VERIFY_TOTP_PATH,
          handler: createAuthMiddleware(async (rawCtx) => {
            const ctx = contextOf(rawCtx);
            const returned = ctx.context.returned;
            const key = ctx.context[USED_KEY];
            if (typeof returned?.token !== "string" || !key) return;

            await db.totpUsedCode.deleteMany({
              where: { usedAt: { lt: new Date(Date.now() - USED_CODE_TTL_MS) } },
            });
            try {
              await db.totpUsedCode.create({ data: { key } });
            } catch {
              throw reusedCodeError();
            }
          }),
        },
      ],
    },
  };
}
