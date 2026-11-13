"use client";

import Link from "next/link";
import { useState } from "react";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string[] | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(["As senhas não conferem."]);
      return;
    }
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(Array.isArray(data.details) ? data.details : [data.error ?? "Falha ao redefinir"]);
      return;
    }
    setDone(true);
  }

  if (!token) {
    return <p className="text-sm text-red-700">Link inválido ou incompleto.</p>;
  }

  if (done) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Senha redefinida</h1>
        <p className="mt-3 text-sm text-zinc-600">Todas as sessões anteriores foram encerradas.</p>
        <Link className="mt-6 inline-block font-medium underline" href="/login">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Definir nova senha</h1>
      <label className="block text-sm font-medium">
        Nova senha
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          minLength={12}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <label className="block text-sm font-medium">
        Confirme a nova senha
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          minLength={12}
          onChange={(event) => setConfirm(event.target.value)}
          required
          type="password"
          value={confirm}
        />
      </label>
      {error ? (
        <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      <button
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white"
        type="submit"
      >
        Redefinir senha
      </button>
    </form>
  );
}
