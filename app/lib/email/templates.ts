import type { EmailMessage } from "./transport";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
  <body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
    <div style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:12px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${body}
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0" />
      <p style="font-size:12px;color:#71717a;margin:0">
        Esta mensagem foi enviada automaticamente pelo Sistema Acadêmico.
        Nunca compartilhe links ou códigos de uso único. A equipe administrativa
        não solicita sua senha por e-mail.
      </p>
    </div>
  </body>
</html>`;
}

export function accountActivationEmail(input: {
  to: string;
  name: string;
  /** Conta criada no sistema — exibida para que o titular saiba qual e-mail usar no login. */
  institutionalEmail: string;
  /** Destino real da mensagem; o e-mail institucional não possui caixa postal. */
  personalEmail?: string | null;
  /** Já contém token e código de confirmação. */
  activationUrl: string;
  validHours?: number;
}): EmailMessage {
  const validHours = input.validHours ?? 24;
  // O link só é enviado ao e-mail pessoal: o institucional é apenas identificador.
  const contactLine = "Enviamos este link para o seu e-mail pessoal cadastrado.";
  return {
    kind: "ACCOUNT_ACTIVATION",
    to: input.to,
    subject: "Ative sua conta no Sistema Acadêmico",
    text:
      `Olá, ${input.name}.\n\n` +
      `E-mail institucional da sua conta: ${input.institutionalEmail}\n` +
      `${contactLine ? `${contactLine}\n` : ""}\n` +
      `Ative sua conta acessando: ${input.activationUrl}\n\n` +
      `O link já contém o código de confirmação de 6 dígitos: ao abri-lo, o campo será preenchido automaticamente. ` +
      `O código é válido por 10 minutos e o link é de uso único, com expiração em ${validHours} horas.\n\n` +
      `Use o e-mail institucional acima para entrar no sistema depois da ativação.`,
    html: layout(
      "Ative sua conta",
      `<p>Olá, ${escapeHtml(input.name)}.</p>
       <p><strong>E-mail institucional da sua conta:</strong> ${escapeHtml(input.institutionalEmail)}. Use-o para entrar no sistema.</p>
       <p style="font-size:13px;color:#71717a">Enviamos este link para o seu e-mail pessoal cadastrado; o institucional acima serve apenas para identificar a conta.</p>
       <p>Para criar sua própria senha, acesse o link abaixo. Ele já contém o código de confirmação: a página preenche o campo de 6 dígitos automaticamente.</p>
       <p style="margin:24px 0">
         <a href="${escapeHtml(input.activationUrl)}" style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ativar conta</a>
       </p>
       <p style="font-size:13px;color:#71717a">O código é válido por 10 minutos e o link é de uso único, expirando em ${validHours} horas. Se você não solicitou o cadastro, ignore esta mensagem.</p>`,
    ),
  };
}

/**
 * Resumo da massa de teste: o titular recebe a lista de e-mails institucionais
 * criados, sem expor tokens/códigos (que ficam apenas no link individual).
 */
export function testAccountsSummaryEmail(input: {
  to: string;
  accounts: Array<{ name: string; email: string; role: string; status: string }>;
}): EmailMessage {
  const rows = input.accounts
    .map(
      (account) =>
        `<li>${escapeHtml(account.name)} — ${escapeHtml(account.email)} (${escapeHtml(account.role)}, ${escapeHtml(account.status)})</li>`,
    )
    .join("");
  const textRows = input.accounts
    .map((account) => `- ${account.name} — ${account.email} (${account.role}, ${account.status})`)
    .join("\n");
  return {
    kind: "SECURITY_ALERT",
    to: input.to,
    subject: "E-mails institucionais da massa de teste",
    text: `Contas criadas para teste:\n\n${textRows}\n\nUse o e-mail institucional de cada conta para entrar após ativá-la.`,
    html: layout(
      "Contas de teste",
      `<p>Contas criadas para teste:</p><ul>${rows}</ul>
       <p style="font-size:13px;color:#71717a">Links e códigos de ativação são individuais e de uso único; não são repetidos neste resumo.</p>`,
    ),
  };
}

export function emailConfirmationCodeEmail(input: {
  to: string;
  name: string;
  code: string;
}): EmailMessage {
  return {
    kind: "EMAIL_CONFIRMATION",
    to: input.to,
    subject: "Código de confirmação de e-mail",
    text: `Olá, ${input.name}.\n\nSeu código de confirmação é ${input.code}. Ele é de uso único e válido por 10 minutos.`,
    html: layout(
      "Confirme seu e-mail",
      `<p>Olá, ${escapeHtml(input.name)}.</p>
       <p>Use o código abaixo para confirmar seu e-mail. Ele é de uso único e válido por 10 minutos.</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:bold;margin:16px 0">${escapeHtml(input.code)}</p>`,
    ),
  };
}

/**
 * E-mail de redefinição solicitada pela secretaria. O link (token) e o código
 * de 6 dígitos são enviados juntos, exclusivamente ao e-mail pessoal real do
 * titular (8.4.3/8.6.1); nenhum administrador define a senha.
 */
export function passwordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  code?: string;
  validMinutes?: number;
}): EmailMessage {
  const validMinutes = input.validMinutes ?? 30;
  const codeLine = input.code
    ? `\n\nCódigo de confirmação de 6 dígitos: ${input.code}. Ele também já vem preenchido no link e expira em 10 minutos.`
    : "";
  return {
    kind: "PASSWORD_RESET",
    to: input.to,
    subject: "Redefinição de senha do Sistema Acadêmico",
    text:
      `Olá, ${input.name}.\n\n` +
      `A secretaria solicitou a redefinição da sua senha (atendimento presencial). ` +
      `Acesse o link abaixo para criar a sua própria senha: ${input.resetUrl}\n\n` +
      `O link é de uso único e expira em ${validMinutes} minutos.${codeLine}\n\n` +
      `Enviamos esta mensagem ao seu e-mail pessoal cadastrado. Se não foi você, ignore-a.`,
    html: layout(
      "Redefinição de senha",
      `<p>Olá, ${escapeHtml(input.name)}.</p>
       <p>A secretaria solicitou a redefinição da sua senha (atendimento presencial). Você mesmo define a nova senha pelo link abaixo, de uso único, que expira em ${validMinutes} minutos.</p>
       ${input.code ? `<p>Código de confirmação de 6 dígitos (válido por 10 minutos): <strong style="font-size:22px;letter-spacing:4px">${escapeHtml(input.code)}</strong>. Ele também já vem preenchido no link.</p>` : ""}
       <p style="margin:24px 0">
         <a href="${escapeHtml(input.resetUrl)}" style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Redefinir senha</a>
       </p>
       <p style="font-size:13px;color:#71717a">Esta mensagem foi enviada ao seu e-mail pessoal cadastrado. Se não foi você, ignore-a. Nenhum administrador redefine senhas.</p>`,
    ),
  };
}

export function securityAlertEmail(input: {
  to: string;
  subject: string;
  message: string;
}): EmailMessage {
  return {
    kind: "SECURITY_ALERT",
    to: input.to,
    subject: `[Segurança] ${input.subject}`,
    text: input.message,
    html: layout("Alerta de segurança", `<p>${escapeHtml(input.message)}</p>`),
  };
}

export const emailTemplates = {
  accountActivationEmail,
  testAccountsSummaryEmail,
  emailConfirmationCodeEmail,
  passwordResetEmail,
  securityAlertEmail,
};
