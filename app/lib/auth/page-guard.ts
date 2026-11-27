import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Permission } from "@/app/types/roles";
import { type AuthenticatedUser, getAuthenticatedUser } from "./session";

/**
 * Guard de páginas do grupo (private). Antes cada uma das 12 páginas repetia
 * `getAuthenticatedUser` + `redirect("/login")` (+ checagem de MFA no layout).
 * Centralizar aqui evita que uma página nova esqueça a verificação (7.3).
 */
export async function requirePageUser(
  options: { skipMfaRedirect?: boolean } = {},
): Promise<AuthenticatedUser> {
  // A sessão só existe na requisição. `connection()` impede que o redirect seja
  // prerrenderizado no shell estático (o que gera erro em produção).
  await connection();
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  // A própria tela de configuração do 2FA precisa ser acessível sem o segundo
  // fator — caso contrário o guard redirecionaria a página para si mesma em loop.
  if (actor.mfaSetupRequired && !options.skipMfaRedirect) redirect("/configurar-2fa");
  return actor;
}

export async function requirePagePermission(permission: Permission): Promise<AuthenticatedUser> {
  const actor = await requirePageUser();
  if (!actor.permissions.has(permission)) redirect("/dashboard");
  return actor;
}
