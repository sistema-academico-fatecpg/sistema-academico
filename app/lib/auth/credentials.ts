import { hashPassword } from "better-auth/crypto";
import { db } from "@/app/lib/db";

/**
 * Grava a credencial usando o mesmo formato do Better Auth: a senha nunca é
 * armazenada em texto puro, apenas com hash forte e salt (seção 8.3.5).
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
