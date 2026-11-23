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
  activationUrl: string;
  code: string;
  validHours?: number;
}): EmailMessage {
  const validHours = input.validHours ?? 24;
  return {
    kind: "ACCOUNT_ACTIVATION",
    to: input.to,
    subject: "Ative sua conta no Sistema Acadêmico",
    text: `Olá, ${input.name}.\n\nAtive sua conta acessando: ${input.activationUrl}\n\nCódigo de confirmação: ${input.code} (válido por 10 minutos).\n\nO link é de uso único e expira em ${validHours} horas.`,
    html: layout(
      "Ative sua conta",
      `<p>Olá, ${escapeHtml(input.name)}.</p>
       <p>Para criar sua própria senha, acesse o link abaixo. O link é de uso único e expira em ${validHours} horas.</p>
       <p style="margin:24px 0">
         <a href="${escapeHtml(input.activationUrl)}" style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ativar conta</a>
       </p>
       <p>Ao abrir o link, informe o código de confirmação enviado junto com esta mensagem:</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:bold;margin:16px 0">${escapeHtml(input.code)}</p>
       <p style="font-size:13px;color:#71717a">O código é de uso único e válido por 10 minutos. Se você não solicitou o cadastro, ignore esta mensagem.</p>`,
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

export function passwordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  validMinutes?: number;
}): EmailMessage {
  const validMinutes = input.validMinutes ?? 30;
  return {
    kind: "PASSWORD_RESET",
    to: input.to,
    subject: "Redefinição de senha do Sistema Acadêmico",
    text: `Olá, ${input.name}.\n\nRecebemos uma solicitação de redefinição de senha. Acesse: ${input.resetUrl}\n\nO link é de uso único e expira em ${validMinutes} minutos. Se não foi você, ignore esta mensagem.`,
    html: layout(
      "Redefinição de senha",
      `<p>Olá, ${escapeHtml(input.name)}.</p>
       <p>Recebemos uma solicitação de redefinição de senha. O link é de uso único e expira em ${validMinutes} minutos.</p>
       <p style="margin:24px 0">
         <a href="${escapeHtml(input.resetUrl)}" style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Redefinir senha</a>
       </p>
       <p style="font-size:13px;color:#71717a">Se não foi você, ignore esta mensagem. Nenhum administrador redefine senhas.</p>`,
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
  emailConfirmationCodeEmail,
  passwordResetEmail,
  securityAlertEmail,
};
