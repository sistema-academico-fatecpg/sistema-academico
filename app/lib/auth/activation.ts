import { sendEmail } from "@/app/lib/email";
import { accountActivationEmail } from "@/app/lib/email/templates";
import { TokenService } from "./tokens";

export function appBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function activationUrl(token: string): string {
  return `${appBaseUrl()}/ativar?token=${encodeURIComponent(token)}`;
}

export function passwordResetUrl(token: string): string {
  return `${appBaseUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

type ActivationRecipient = {
  id: string;
  name: string;
  email: string;
};

/**
 * Emite um link de ativação de uso único (24 h) e o envia ao titular. O
 * administrador nunca conhece a senha (seções 8.1 e 8.2).
 */
export async function deliverActivation(
  user: ActivationRecipient,
  tokens = new TokenService(),
): Promise<void> {
  const issued = await tokens.issue(user.id, "ACCOUNT_ACTIVATION");
  await sendEmail(
    accountActivationEmail({
      to: user.email,
      name: user.name,
      activationUrl: activationUrl(issued.token),
      code: issued.code,
      validHours: 24,
    }),
  );
}
