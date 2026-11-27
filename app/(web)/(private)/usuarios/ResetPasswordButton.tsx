"use client";

import { useState } from "react";
import { Button, Confirm, FormFeedback } from "@/components";

/** Ação da secretaria para enviar o link de redefinição de senha (8.3). */
export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestReset() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(userId)}/request-password-reset`,
        { method: "POST" },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Não foi possível enviar o link.");
        return;
      }
      setMessage("Link de redefinição enviado ao e-mail institucional.");
      setOpen(false);
    } catch {
      setError("Não foi possível enviar o link. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        iconName="security"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="tertiary"
      >
        Redefinir senha
      </Button>
      <Confirm
        confirmLabel={loading ? "Enviando…" : "Enviar link"}
        description={
          <>
            Um link de uso único, válido por 30 minutos, será enviado ao e-mail institucional de{" "}
            <strong>{userName}</strong>. A solicitação é registrada em auditoria.
          </>
        }
        onCancel={() => setOpen(false)}
        onConfirm={() => void requestReset()}
        open={open}
        title="Solicitar redefinição de senha"
      />
      {message ? <FormFeedback message={message} /> : null}
      {error ? <FormFeedback error={error} /> : null}
    </>
  );
}
