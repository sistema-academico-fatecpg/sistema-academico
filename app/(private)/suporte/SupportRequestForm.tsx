"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FormFeedback, Input, Label } from "@/components/ui";
import { SUPPORT_MODULES } from "./constants";

const FIELD_CLASS = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";

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
    <form className="space-y-4" onSubmit={submit}>
      <Label>
        Motivo
        <textarea className={`${FIELD_CLASS} min-h-20`} minLength={10} name="reason" required />
      </Label>
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="text-sm font-semibold">Módulos (escopo)</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          {SUPPORT_MODULES.map((module) => (
            <label className="flex items-center gap-2" key={module}>
              <input name={`module-${module}`} type="checkbox" />
              {module}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 md:grid-cols-2">
        <Label>
          Início (opcional)
          <Input name="startsAt" type="datetime-local" />
        </Label>
        <Label>
          Término (máx. 8h)
          <Input name="endsAt" required type="datetime-local" />
        </Label>
      </div>
      <label className="flex items-center gap-2 text-sm">
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
