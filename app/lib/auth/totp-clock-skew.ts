import { createHmac, timingSafeEqual } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { symmetricDecrypt } from "better-auth/crypto";
import { db } from "@/app/lib/db";
import { resolveTotpUserId, type TotpHookContext } from "./totp-user";

const PERIOD_MS = 30_000;
const DIGITS = 6;

/** Aceita códigos de até duas janelas (60 s) à frente ou atrás do servidor. */
const EXTRA_WINDOWS = 2;

/** Código TOTP RFC 6238 para um contador específico. */
export function totpCodeAt(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", Buffer.from(secret, "utf8")).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(value % 10 ** DIGITS).padStart(DIGITS, "0");
}

function sameCode(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Converte um código gerado com relógio levemente dessincronizado no código da
 * janela atual. Retorna `null` quando o código já é válido na janela atual
 * (o plugin cuida dele) ou quando não corresponde a nenhuma janela aceita.
 */
export function normalizeSkewedTotpCode(
  secret: string,
  code: string,
  nowMs = Date.now(),
): string | null {
  if (!/^\d{6}$/.test(code)) return null;
  const counter = Math.floor(nowMs / PERIOD_MS);
  for (let offset = -EXTRA_WINDOWS; offset <= EXTRA_WINDOWS; offset += 1) {
    const candidate = totpCodeAt(secret, counter + offset);
    if (!sameCode(code, candidate)) continue;
    return offset === 0 ? null : totpCodeAt(secret, counter);
  }
  return null;
}

export async function decryptTotpSecret(key: unknown, encrypted: string): Promise<string | null> {
  try {
    const secret = await symmetricDecrypt({ key: key as never, data: encrypted });
    // Segredos importados de outros provedores são tratados pelo próprio plugin.
    return secret.startsWith("base32:") ? null : secret;
  } catch {
    return null;
  }
}

/** Tolerância a relógios levemente dessincronizados no aplicativo autenticador. */
export function withTotpClockSkew(plugin: BetterAuthPlugin): BetterAuthPlugin {
  return {
    ...plugin,
    hooks: {
      ...(plugin.hooks ?? {}),
      before: [
        {
          matcher: (context) => context.path === "/two-factor/verify-totp",
          handler: createAuthMiddleware(async (rawCtx) => {
            const ctx = rawCtx as unknown as TotpHookContext & { body?: { code?: string } };
            const code = ctx.body?.code;
            if (typeof code !== "string" || !/^\d{6}$/.test(code)) return;

            const userId = await resolveTotpUserId(ctx);
            if (!userId) return;
            const twoFactor = await db.twoFactor.findFirst({
              where: { userId },
              select: { secret: true },
            });
            if (!twoFactor) return;
            const secret = await decryptTotpSecret(
              (rawCtx as unknown as { context: { secretConfig: unknown } }).context.secretConfig,
              twoFactor.secret,
            );
            if (!secret) return;

            const normalized = normalizeSkewedTotpCode(secret, code);
            if (normalized && ctx.body) {
              return { context: { body: { ...ctx.body, code: normalized } } };
            }
          }),
        },
        ...(plugin.hooks?.before ?? []),
      ],
    },
  };
}
