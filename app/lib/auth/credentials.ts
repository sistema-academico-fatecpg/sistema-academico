import { db } from "@/app/lib/db";
import { hashPassword } from "@/app/lib/security/password-hash";

/**
 * Grava a credencial usando Argon2id (seção 8.3.5). A senha nunca é
 * armazenada em texto puro e não há criptografia reversível.
 */
export async function setUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const existing = await db.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });

  if (existing) {
    await db.account.update({
      where: { id: existing.id },
      data: { password: passwordHash },
    });
  } else {
    await db.account.create({
      data: {
        userId,
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  // Qualquer sessão anterior deixa de valer após troca de senha.
  await db.session.deleteMany({ where: { userId } });
}
