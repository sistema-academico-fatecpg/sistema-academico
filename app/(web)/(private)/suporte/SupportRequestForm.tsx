"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FormFeedback, Input, Label } from "@/components";
import { SUPPORT_MODULES } from "./constants";
import styles from "./styles.module.scss";

export function SupportRequestForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const modules = SUPPORT_MODULES.filter((module) => form.get(`module-${module}`) === "on");
    const endsAt = String(form.get("endsAt") ?? "");
    const startsAt = String(form.get("startsAt") ?? "");
    const response = await fetch("/api/support/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reason: form.get("reason"),
        modules,
        ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
        endsAt: new Date(endsAt).toISOString(),
        involvesAuditor: form.get("involvesAuditor") === "on",
        authorizationDocument: form.get("authorizationDocument") || undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível registrar a solicitação");
      return;
    }
    setMessage("Solicitação enviada ao Auditor (validade máxima de 8 horas).");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <Label>
        Motivo
        <textarea className={styles.textarea} minLength={10} name="reason" required />
      </Label>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Módulos (escopo)</legend>
        <div className={styles.moduleGrid}>
          {SUPPORT_MODULES.map((module) => (
            <label className={styles.checkboxRow} key={module}>
              <input name={`module-${module}`} type="checkbox" />
              {module}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.dateGrid}>
        <Label>
          Início (opcional)
          <Input name="startsAt" type="datetime-local" />
        </Label>
        <Label>
          Término (máx. 8h)
          <Input name="endsAt" required type="datetime-local" />
        </Label>
      </div>
      <label className={styles.checkboxRow}>
        <input name="involvesAuditor" type="checkbox" />
        Investigação envolve o próprio Auditor
      </label>
      <Label>
        Autorização da direção (quando aplicável)
        <Input name="authorizationDocument" />
      </Label>
      <FormFeedback error={error} message={message} />
      <Button type="submit">Solicitar acesso</Button>
    </form>
  );
}
