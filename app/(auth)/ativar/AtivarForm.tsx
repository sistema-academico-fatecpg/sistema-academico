"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/app/lib/auth/client";
import { savePendingTotpSetup } from "@/app/lib/auth/totp-setup";

export function AtivarForm({ token, code: initialCode }: { token: string; code: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
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

  /** Aproveita a senha recém-criada: a tela TOTP não pede a senha outra vez. */
  async function startTotpSetup() {
    setError(null);
    setLoading(true);
    const result = await authClient.twoFactor.enable({ password });
    setLoading(false);
    if (result.error || result.data?.method !== "totp") {
      setError([
        result.error?.message ?? "Não foi possível iniciar a configuração do autenticador.",
      ]);
      return;
    }
    if (!result.data.totpURI || !result.data.backupCodes) {
      setError(["O autenticador não retornou a chave de configuração."]);
      return;
    }
    savePendingTotpSetup({
      totpURI: result.data.totpURI,
      backupCodes: result.data.backupCodes,
    });
    router.push("/configurar-2fa");
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
    const data = (await response.json()) as {
      requiresTwoFactorSetup?: boolean;
      sessionStarted?: boolean;
      error?: string;
      details?: Array<{ message: string } | string>;
    };
    setLoading(false);
    if (!response.ok) {
      setError(
        Array.isArray(data.details)
          ? data.details.map((item) => (typeof item === "string" ? item : item.message))
          : [data.error ?? "Falha na ativação"],
      );
      return;
    }

    if (!data.sessionStarted) {
      router.push("/login");
      return;
    }
    if (data.requiresTwoFactorSetup) {
      await startTotpSetup();
      return;
    }
    // Alunos não são obrigados a usar TOTP: oferecemos as duas opções.
    setDone(true);
  }

  if (done) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Conta ativada</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Sua senha foi definida e você já está autenticado. Para alunos, o segundo fator é
          opcional.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white"
            onClick={() => router.push("/dashboard")}
            type="button"
          >
            Entrar diretamente
          </button>
          <button
            className="rounded-lg border border-zinc-300 px-4 py-2 font-medium disabled:opacity-50"
            disabled={loading}
            onClick={() => void startTotpSetup()}
            type="button"
          >
            {loading ? "Gerando chave..." : "Configurar autenticador (opcional)"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Ativação de conta</h1>
      <p className="text-sm text-zinc-600">
        Crie sua própria senha. O código de 6 dígitos veio junto com o link e já foi preenchido; ele
        continua sendo conferido no servidor. A senha nunca é definida por administradores.
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
      <p className="text-xs text-zinc-500">
        <Link className="underline" href="/login">
          Já tenho conta: ir para o login
        </Link>
      </p>
    </form>
  );
}
