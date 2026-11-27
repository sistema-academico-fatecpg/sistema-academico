import { randomBytes } from "node:crypto";
import { generateRandomString, symmetricEncrypt } from "better-auth/crypto";
import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";

const ISSUER = "Sistema Acadêmico";
const BodySchema = z.object({}).optional();

/**
 * Gera a chave TOTP para um usuário JÁ AUTENTICADO.
 *
 * O endpoint `twoFactor.enable` do Better Auth exige a senha mesmo com
 * `allowPasswordless`, porque o usuário tem credencial de senha. Como o titular
 * acabou de fazer login, a sessão já é a prova de identidade: aqui gravamos a
 * chave no formato usado pelo próprio Better Auth (secret cifrada com
 * BETTER_AUTH_SECRET) para que `verifyTotp` funcione normalmente.
 */
export async function POST(request: Request) {
  try {
    BodySchema.parse(await request.json().catch(() => ({})));
    const actor = await requireUser(request.headers);
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret || secret === "replace-with-a-secure-secret") {
      throw new Error("BETTER_AUTH_SECRET não configurada");
    }

    const plainSecret = generateRandomString(32);
    const encryptedSecret = await symmetricEncrypt({ key: secret, data: plainSecret });
    const existing = await db.twoFactor.findFirst({ where: { userId: actor.id } });
    if (existing) {
      await db.twoFactor.update({
        where: { id: existing.id },
        data: {
          secret: encryptedSecret,
          backupCodes: "[]",
          verified: false,
          failedVerificationCount: 0,
          lockedUntil: null,
        },
      });
    } else {
      await db.twoFactor.create({
        data: {
          userId: actor.id,
          secret: encryptedSecret,
          backupCodes: "[]",
          verified: false,
        },
      });
    }

    // O secret em claro volta apenas nesta resposta, para montar o QR code.
    const totpURI = `otpauth://totp/${encodeURIComponent(`${ISSUER}:${actor.email}`)}?secret=${plainSecret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
    const backupCodes = Array.from({ length: 10 }, () => randomBytes(5).toString("hex"));

    return Response.json({ totpURI, backupCodes });
  } catch (error) {
    return jsonError(error);
  }
}
