import { sendEmail } from "@/app/lib/email";
import { accountActivationEmail } from "@/app/lib/email/templates";
import { TokenService } from "./tokens";

export function appBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * O código de confirmação viaja junto com o token na URL. Ao abrir o link, o
 * frontend já preenche o campo de 6 dígitos — o titular não precisa copiá-lo
 * do e-mail (o código continua sendo validado no servidor).
 */
export function activationUrl(token: string, code?: string): string {
  const url = new URL("/ativar", appBaseUrl());
  url.searchParams.set("token", token);
  if (code) url.searchParams.set("code", code);
  return url.toString();
}

export function passwordResetUrl(token: string): string {
  return `${appBaseUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

type ActivationRecipient = {
  id: string;
  name: string;
  /** E-mail institucional: identifica a conta no sistema. */
  email: string;
  /** E-mail pessoal: destino preferencial do link, quando informado. */
  personalEmail?: string | null;
};

/**
 * Emite um link de ativação de uso único (24 h) e o envia ao titular. O
 * destinatário preferencial é o e-mail pessoal (quando cadastrado), pois o
 * domínio institucional pode não estar verificado no provedor de e-mail.
 * Nunca enviamos a senha: ela é definida pelo titular (seções 8.1 e 8.2).
 */
export async function deliverActivation(
  user: ActivationRecipient,
  tokens = new TokenService(),
): Promise<void> {
  const issued = await tokens.issue(user.id, "ACCOUNT_ACTIVATION");
  const recipient = user.personalEmail?.trim().toLowerCase() || user.email;
  await sendEmail(
    accountActivationEmail({
      to: recipient,
      name: user.name,
      institutionalEmail: user.email,
      personalEmail: user.personalEmail ?? null,
      activationUrl: activationUrl(issued.token, issued.code),
      validHours: 24,
    }),
  );
}
