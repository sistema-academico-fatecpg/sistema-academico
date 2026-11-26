import { createHash } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "@/app/lib/db";
import { decryptTotpSecret, totpCodeAt } from "./totp-clock-skew";
import { resolveTotpUserId, type TotpHookContext } from "./totp-user";

/**
 * Diagnóstico temporário do fluxo TOTP. Registra no servidor o que foi
 * recebido, o que o banco esperava e o erro real devolvido pelo Better Auth.
 * Nenhum segredo completo é gravado: apenas uma impressão digital e o
 * prefixo curto da URI, suficientes para comparar com a chave do celular.
 */
const LOG_PREFIX = "[TOTP-DIAG]";
const PERIOD_MS = 30_000;

// O tipo do Better Auth é genérico; `any` preserva a assinatura original ao
// reatribuir o endpoint sem alterar o roteamento.
// biome-ignore lint/suspicious/noExplicitAny: assinatura externa genérica
type Endpoint = ((ctx: any) => Promise<any>) & {
  path?: string;
  options?: unknown;
};

type AuthContext = TotpHookContext & {
  body?: { code?: string; password?: string; method?: string };
  context: TotpHookContext["context"] & { secretConfig?: unknown };
};

function emit(event: string, data: Record<string, unknown>) {
  console.warn(`${LOG_PREFIX} ${JSON.stringify({ event, at: new Date().toISOString(), ...data })}`);
}

function errorDetails(error: unknown) {
  const e = error as {
    status?: string | number;
    statusCode?: number;
    code?: string;
    message?: string;
    body?: { code?: string; message?: string };
  };
  return {
    status: e.status ?? e.statusCode ?? null,
    code: e.code ?? e.body?.code ?? null,
    message: e.message ?? e.body?.message ?? null,
  };
}

function secretFingerprint(secret: string) {
  return {
    sha256: createHash("sha256").update(secret).digest("hex").slice(0, 12),
    prefix: Buffer.from(secret, "utf8").toString("utf8").slice(0, 4),
    length: secret.length,
  };
}

async function snapshot(ctx: AuthContext, code: string | undefined) {
  const userId = await resolveTotpUserId(ctx);
  if (!userId) return { userId: null };
  const twoFactor = await db.twoFactor.findFirst({
    where: { userId },
    select: { secret: true, verified: true },
  });
  if (!twoFactor?.secret) return { userId, stored: null };

  const secret = await decryptTotpSecret(ctx.context.secretConfig, twoFactor.secret);
  if (!secret) return { userId, stored: { decryptFailed: true } };

  const now = Date.now();
  const counter = Math.floor(now / PERIOD_MS);
  const expected = totpCodeAt(secret, counter);
  const matchedOffsets: number[] = [];
  for (let offset = -4; offset <= 4; offset += 1) {
    if (code && totpCodeAt(secret, counter + offset) === code) matchedOffsets.push(offset);
  }
  return {
    userId,
    stored: {
      ...secretFingerprint(secret),
      verified: twoFactor.verified,
      expectedNow: expected,
      matchedOffsets,
      serverUtc: new Date(now).toISOString(),
    },
  };
}

function wrap(
  endpoint: Endpoint,
  name: string,
  onSuccess?: (ctx: AuthContext, result: unknown) => Promise<void>,
) {
  const original = endpoint;
  const wrapped = (async (ctx: AuthContext) => {
    const code = ctx.body?.code;

    try {
      const result = await original(ctx);
      if (onSuccess) {
        try {
          await onSuccess(ctx, result);
        } catch (error) {
          emit("onSuccess.failed", { endpoint: name, ...errorDetails(error) });
        }
      }
      emit(`${name}.success`, { receivedCode: code ?? null });
      return result;
    } catch (error) {
      emit(`${name}.error`, {
        receivedCode: code ?? null,
        ...errorDetails(error),
      });
      throw error;
    }
  }) as Endpoint;
  wrapped.path = original.path;
  wrapped.options = original.options;
  return wrapped;
}

/**
 * Envolve os endpoints do plugin two-factor para expor o erro real nos logs.
 * Mantém `path`/`options` para o roteador do Better Auth continuar montando a
 * rota exatamente como antes.
 */
export function withTotpDiagnostics(plugin: BetterAuthPlugin): BetterAuthPlugin {
  // Instrumentação temporária: desligada por padrão para não registrar códigos
  // em produção. Ative com TOTP_DEBUG_LOGS=1 no .env local do Docker.
  if (process.env.TOTP_DEBUG_LOGS !== "1") return plugin;

  const endpoints = { ...(plugin.endpoints ?? {}) } as Record<string, Endpoint>;
  if (endpoints.verifyTOTP) {
    endpoints.verifyTOTP = wrap(endpoints.verifyTOTP, "verifyTOTP");
  }
  if (endpoints.enableTwoFactor) {
    endpoints.enableTwoFactor = wrap(
      endpoints.enableTwoFactor,
      "enableTwoFactor",
      async (ctx, result) => {
        const uri = (result as { totpURI?: string } | undefined)?.totpURI;
        let uriSecret: string | null = null;
        try {
          const url = new URL(uri ?? "");
          uriSecret = url.searchParams.get("secret");
        } catch {
          uriSecret = null;
        }
        emit("enableTwoFactor.uri", {
          userId: (await snapshot(ctx, undefined)).userId,
          uriSecret: uriSecret
            ? { ...secretFingerprint(uriSecret), prefixFull: uriSecret.slice(0, 12) }
            : null,
        });
      },
    );
  }
  return {
    ...plugin,
    endpoints: endpoints as typeof plugin.endpoints,
    hooks: {
      ...(plugin.hooks ?? {}),
      before: [
        {
          matcher: (context: { path?: string }) => context.path === "/two-factor/verify-totp",
          handler: createAuthMiddleware(async (rawCtx) => {
            const ctx = rawCtx as unknown as AuthContext;
            try {
              const context = await snapshot(ctx, ctx.body?.code);
              emit("verifyTOTP.raw", { ...context, receivedCode: ctx.body?.code ?? null });
            } catch (error) {
              emit("snapshot.failed", { endpoint: "verifyTOTP.raw", ...errorDetails(error) });
            }
          }),
        },
        ...(plugin.hooks?.before ?? []),
      ],
    },
  };
}
