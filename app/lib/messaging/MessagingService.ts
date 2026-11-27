import {
  createEmailTransport,
  type EmailMessage,
  type EmailSendResult,
  type EmailTransport,
  maskEmail,
} from "@/app/lib/email/transport";

export type SendableEmail = Omit<EmailMessage, "kind"> & { kind?: EmailMessage["kind"] };

/**
 * Serviço de mensageria isolado: o transporte padrão é injetado no construtor
 * e pode ser substituído apenas em uma operação (mock, teste, simulação).
 */
export class MessagingService {
  constructor(private readonly defaultTransport: EmailTransport = createEmailTransport()) {}

  async sendEmail(message: SendableEmail, transport?: EmailTransport): Promise<EmailSendResult> {
    const selected = transport ?? this.defaultTransport;
    try {
      return await selected.send({ ...message, kind: message.kind ?? "GENERIC" });
    } catch (error) {
      // Nunca registra o conteúdo da mensagem (contém links de uso único).
      console.error("[mensageria] falha no envio", {
        kind: message.kind ?? "GENERIC",
        to: maskEmail(message.to),
        error: error instanceof Error ? error.name : "unknown",
      });
      throw error;
    }
  }
}
