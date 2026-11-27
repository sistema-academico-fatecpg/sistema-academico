import { sendEmail } from "@/app/lib/email";
import { accountActivationEmail } from "@/app/lib/email/templates";
import { validationError } from "./errors";
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

/** O link de redefinição também carrega o código de 6 dígitos (8.4.3/8.6.1). */
export function passwordResetUrl(token: string, code?: string): string {
  const url = new URL("/redefinir-senha", appBaseUrl());
  url.searchParams.set("token", token);
  if (code) url.searchParams.set("code", code);
  return url.toString();
}

type ActivationRecipient = {
  id: string;
  name: string;
  /** E-mail institucional: identifica a conta no sistema (caixa fictícia). */
  email: string;
  /** E-mail pessoal real: único destino permitido para links de uso único. */
  personalEmail?: string | null;
};

/**
 * Emite um link de ativação de uso único (24 h) com código de confirmação e o
 * envia exclusivamente ao e-mail pessoal do titular. O e-mail institucional é
 * fictício e não recebe mensagens: se o e-mail pessoal não estiver cadastrado,
 * a emissão falha com erro de validação. Nunca enviamos a senha: ela é definida
 * pelo titular (seções 8.1 e 8.2).
 */
export async function deliverActivation(
  user: ActivationRecipient,
  tokens = new TokenService(),
): Promise<void> {
  const personalEmail = user.personalEmail?.trim().toLowerCase();
  if (!personalEmail) {
    throw validationError(
      "E-mail pessoal não cadastrado: não é possível enviar o link de ativação. Atualize o e-mail pessoal do titular antes de reenviar (seção 8.2).",
    );
  }

  const issued = await tokens.issue(user.id, "ACCOUNT_ACTIVATION");
  await sendEmail(
    accountActivationEmail({
      to: personalEmail,
      name: user.name,
      institutionalEmail: user.email,
      personalEmail,
      activationUrl: activationUrl(issued.token, issued.code),
      validHours: 24,
    }),
  );
}
