import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  try {
    const result = await resend.emails.send({
      from: "Sistema Acadêmico <noreply@sistema-academico.edu.br>",
      to,
      subject,
      text,
      html,
    });
    return result;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
}
