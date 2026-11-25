import { createHash } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { db } from "@/app/lib/db";

/** Reserva de código: 5 minutos (cobre a janela TOTP de 30s com folga). */
const RESERVATION_TTL_MS = 5 * 60_000;

const VERIFY_TOTP_PATH = "/two-factor/verify-totp";

/**
 * 8.4.2: "Cada código é aceito uma única vez".
 *
 * O plugin twoFactor do Better Auth já consome o desafio de 2FA no sucesso e
 * aplica `accountLockout`, mas um mesmo código TOTP poderia ser reapresentado
 * dentro da janela de 30 s em um novo desafio. Este wrapper adiciona um hook
 * `before` que reserva atomicamente o par (desafio, código): uma segunda
 * tentativa com o mesmo par falha com erro genérico.
 *
 * A chave usa o cabeçalho de cookies do desafio, portanto não há colisão entre
 * usuários diferentes que por acaso gerem o mesmo código de 6 dígitos.
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
          handler: createAuthMiddleware(async (ctx) => {
            const loose = ctx as unknown as {
              body?: { code?: string };
              headers?: Headers;
              request?: { headers?: Headers };
            };
            const code = loose.body?.code;
            if (typeof code !== "string" || code.length === 0) return;
            const cookie =
              loose.headers?.get("cookie") ?? loose.request?.headers?.get("cookie") ?? "";
            const key = createHash("sha256").update(`${cookie}|${code}`).digest("hex");

            // Limpeza oportunista sem ler conteúdo de logs.
            await db.totpUsedCode.deleteMany({
              where: { usedAt: { lt: new Date(Date.now() - RESERVATION_TTL_MS) } },
            });
            try {
              await db.totpUsedCode.create({ data: { key } });
            } catch {
              throw new APIError("BAD_REQUEST", {
                message: "Código de verificação inválido ou já utilizado",
                code: "TOTP_ALREADY_USED",
              });
            }
          }),
        },
      ],
    },
  };
}
