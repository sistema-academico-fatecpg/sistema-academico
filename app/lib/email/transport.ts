import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Usado apenas para métricas/erros, nunca para conteúdo sensível. */
  kind:
    | "ACCOUNT_ACTIVATION"
    | "EMAIL_CONFIRMATION"
    | "PASSWORD_RESET"
    | "SECURITY_ALERT"
    | "GENERIC";
};

export type EmailSendResult = {
  id: string | null;
  skipped: boolean;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

const FROM = process.env.EMAIL_FROM ?? "Sistema Acadêmico <nao-responda@localhost>";

export class ResendEmailTransport implements EmailTransport {
  private client: Resend | null = null;

  constructor(private readonly apiKey = process.env.RESEND_API_KEY) {}

  private getClient(): Resend {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }
    if (!this.client) {
      this.client = new Resend(this.apiKey);
    }
    return this.client;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const result = await this.getClient().emails.send({
      from: FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (result.error) {
      // Não incluir o conteúdo da mensagem no erro: ele contém links de uso único.
      throw new Error(`Falha no provedor de e-mail: ${result.error.name}`);
    }

    return { id: result.data?.id ?? null, skipped: false };
  }
}

/**
 * Em desenvolvimento/teste, sem chave da Resend, o envio é apenas registrado
 * com metadados não sensíveis. Em produção a ausência da chave é um erro.
 */
export class ConsoleEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOG_EMAILS) {
      throw new Error("Serviço de e-mail não configurado em produção");
    }
    console.info("[email] mensagem não enviada (transporte de desenvolvimento)", {
      kind: message.kind,
      to: maskEmail(message.to),
    });
    return { id: null, skipped: true };
  }
}

export function createEmailTransport(): EmailTransport {
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailTransport();
  }
  return new ConsoleEmailTransport();
}

let defaultTransport: EmailTransport | null = null;

export function setEmailTransportForTests(transport: EmailTransport | null) {
  defaultTransport = transport;
}

export async function sendEmail(
  message: Omit<EmailMessage, "kind"> & { kind?: EmailMessage["kind"] },
  transport: EmailTransport = defaultTransport ?? createEmailTransport(),
): Promise<EmailSendResult> {
  try {
    return await transport.send({ ...message, kind: message.kind ?? "GENERIC" });
  } catch (error) {
    // Log sem conteúdo sensível (seção 10.5).
    console.error("[email] falha no envio", {
      kind: message.kind ?? "GENERIC",
      to: maskEmail(message.to),
      error: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}
