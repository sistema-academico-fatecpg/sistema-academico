"use client";

import { useState } from "react";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? data.message : "Não foi possível processar a solicitação agora.");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Recuperar senha</h1>
      <p className="text-sm text-zinc-600">
        Enviaremos um link de uso único, válido por 30 minutos. Por segurança, a resposta é a mesma
        exista ou não a conta.
      </p>
      <label className="block text-sm font-medium">
        E-mail institucional
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      {message ? <p className="rounded-lg bg-zinc-100 p-3 text-sm">{message}</p> : null}
      <button
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? "Enviando..." : "Enviar link"}
      </button>
    </form>
  );
}
