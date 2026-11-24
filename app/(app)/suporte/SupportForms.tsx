"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MODULES = [
  "USERS",
  "ROLES",
  "COURSES",
  "PERIODS",
  "SUBJECTS",
  "CLASSES",
  "ENROLLMENTS",
  "GRADES",
  "AUDIT_LOGS",
  "BACKUPS",
  "REPORTS",
] as const;

export function SupportRequestForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const modules = MODULES.filter((module) => form.get(`module-${module}`) === "on");
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
      <label className="block text-sm font-medium">
        Motivo
        <textarea
          className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
          minLength={10}
          name="reason"
          required
        />
      </label>
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="text-sm font-semibold">Módulos (escopo)</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          {MODULES.map((module) => (
            <label className="flex items-center gap-2" key={module}>
              <input name={`module-${module}`} type="checkbox" />
              {module}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Início (opcional)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            name="startsAt"
            type="datetime-local"
          />
        </label>
        <label className="block text-sm font-medium">
          Término (máx. 8h)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            name="endsAt"
            required
            type="datetime-local"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="involvesAuditor" type="checkbox" />
        Investigação envolve o próprio Auditor
      </label>
      <label className="block text-sm font-medium">
        Autorização da direção (quando aplicável)
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          name="authorizationDocument"
        />
      </label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <button
        className="rounded-lg bg-[#6b1720] px-4 py-2 text-sm font-semibold text-white"
        type="submit"
      >
        Solicitar acesso
      </button>
    </form>
  );
}

export function SupportDecisionForm({
  grantId,
  involvesAuditor,
}: {
  grantId: string;
  involvesAuditor: boolean;
}) {
  const router = useRouter();
  const [direction, setDirection] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "REJECT") {
    setError(null);
    const response = await fetch(`/api/support/access/${grantId}/decision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(direction ? { "x-direction-authorization": direction } : {}),
      },
      body: JSON.stringify({ decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível decidir");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2">
      {involvesAuditor ? (
        <input
          aria-label="Autorização da direção"
          className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm"
          onChange={(event) => setDirection(event.target.value)}
          placeholder="Documento de autorização da direção"
          value={direction}
        />
      ) : null}
      <div className="flex gap-2">
        <button
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
          onClick={() => decide("APPROVE")}
          type="button"
        >
          Aprovar
        </button>
        <button
          className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-800"
          onClick={() => decide("REJECT")}
          type="button"
        >
          Recusar
        </button>
      </div>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
