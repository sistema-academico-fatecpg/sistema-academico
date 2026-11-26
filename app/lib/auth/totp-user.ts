import { db } from "@/app/lib/db";

/** Contexto mínimo necessário para identificar o titular de um desafio TOTP. */
export type TotpHookContext = {
  context: {
    session?: { user?: { id?: string } } | null;
    authCookies: { sessionToken: { name: string } };
    secret: string;
    createAuthCookie: (name: string) => { name: string };
  };
  getSignedCookie: (name: string, secret: string) => Promise<string | false | null>;
};

/**
 * Hooks `before` rodam antes do middleware de sessão. Em login não há sessão,
 * mas existe o cookie assinado do desafio 2FA; na configuração do TOTP há a
 * sessão ativa. Resolve o usuário nos dois caminhos sem confiar em cookies
 * crus, que mudam quando a sessão é rotacionada.
 */
export async function resolveTotpUserId(ctx: TotpHookContext): Promise<string | null> {
  const sessionUserId = ctx.context.session?.user?.id;
  if (typeof sessionUserId === "string") return sessionUserId;

  const sessionToken = await ctx.getSignedCookie(
    ctx.context.authCookies.sessionToken.name,
    ctx.context.secret,
  );
  if (typeof sessionToken === "string" && sessionToken) {
    const session = await db.session.findUnique({
      where: { token: sessionToken },
      select: { userId: true },
    });
    if (session) return session.userId;
  }

  const twoFactorCookie = ctx.context.createAuthCookie("two_factor");
  const identifier = await ctx.getSignedCookie(twoFactorCookie.name, ctx.context.secret);
  if (typeof identifier !== "string" || !identifier) return null;
  const verification = await db.verification.findFirst({
    where: { identifier },
    select: { value: true, expiresAt: true },
  });
  return verification && verification.expiresAt > new Date() ? verification.value : null;
}
