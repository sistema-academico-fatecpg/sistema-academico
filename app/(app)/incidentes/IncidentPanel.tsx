"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IncidentPanel() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function report(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description, severity: "HIGH", involvesMaster: false }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível registrar o incidente");
      return;
    }
    setMessage("Incidente registrado; Admin Master e Auditor foram alertados.");
    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={report}
      >
        <h2 className="font-semibold text-slate-900">Registrar incidente</h2>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          required
          value={title}
        />
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição"
          required
          value={description}
        />
        <button
          className="rounded-lg bg-[#6b1720] px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Comunicar
        </button>
      </form>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <p className="text-xs text-slate-500">
        O avanço do fluxo (conter, analisar, restaurar, notificar, encerrar) é feito pelas rotas
        `/api/incidents/:id/:action`, com as condições de 13.2 validadas no servidor.
      </p>
    </div>
  );
}
