import { describe, expect, it, vi } from "vitest";
import type { EmailMessage, EmailTransport } from "@/app/lib/email/transport";
import { MessagingService } from "./MessagingService";

const message: EmailMessage = {
  kind: "GENERIC",
  to: "destinatario@example.com",
  subject: "Assunto",
  text: "Corpo",
  html: "<p>Corpo</p>",
};

describe("MessagingService", () => {
  it("usa o transporte padrão injetado no construtor", async () => {
    const send = vi.fn().mockResolvedValue({ id: "id-1", skipped: false });
    const service = new MessagingService({ send } as EmailTransport);

    const result = await service.sendEmail(message);

    expect(send).toHaveBeenCalledOnce();
    expect(result.id).toBe("id-1");
  });

  it("usa o transporte informado apenas nesta operação", async () => {
    const defaultSend = vi.fn().mockResolvedValue({ id: "default", skipped: false });
    const overrideSend = vi.fn().mockResolvedValue({ id: "override", skipped: true });
    const service = new MessagingService({ send: defaultSend } as EmailTransport);

    const result = await service.sendEmail(message, { send: overrideSend } as EmailTransport);

    expect(overrideSend).toHaveBeenCalledOnce();
    expect(defaultSend).not.toHaveBeenCalled();
    expect(result.id).toBe("override");
  });
});
