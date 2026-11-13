"use client";

import Link from "next/link";
import { useState } from "react";

export function AtivarForm({ token }: { token: string }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string[] | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Link inválido</h1>
        <p className="mt-3 text-sm text-zinc-600">
          O link de ativação está incompleto. Solicite um novo link à secretaria.
        </p>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(["As senhas não conferem."]);
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, code, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(Array.isArray(data.details) ? data.details : [data.error ?? "Falha na ativação"]);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Conta ativada</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Sua senha foi definida. Entre no sistema para concluir a configuração.
        </p>
        <Link className="mt-6 inline-block font-medium underline" href="/login">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Ativação de conta</h1>
      <p className="text-sm text-zinc-600">
        Informe o código de 6 dígitos recebido por e-mail e crie sua própria senha. O link é de uso
        único e a senha nunca é definida por administradores.
      </p>

      <label className="block text-sm font-medium">
        Código de confirmação
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 tracking-widest"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          required
          value={code}
        />
      </label>

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
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? "Ativando..." : "Definir senha e ativar"}
      </button>
    </form>
  );
}
