"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/app/lib/auth/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (needsTotp) {
      const result = await authClient.twoFactor.verifyTotp({ code });
      setLoading(false);
      if (result.error) {
        setError(result.error.message ?? "Código inválido");
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const result = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Não foi possível entrar");
      return;
    }
    if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
      setNeedsTotp(true);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Entrar</h1>
      <p className="text-sm text-zinc-600">
        Acesso com e-mail institucional e senha. Perfis administrativos usam segundo fator (TOTP).
      </p>

      {needsTotp ? (
        <label className="block text-sm font-medium">
          Código do autenticador
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 tracking-widest"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            required
            value={code}
          />
        </label>
      ) : (
        <>
          <label className="block text-sm font-medium">
            E-mail institucional
            <input
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm font-medium">
            Senha
            <input
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
        </>
      )}

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <button
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? "Verificando..." : needsTotp ? "Confirmar código" : "Entrar"}
      </button>

      <div className="flex justify-between text-sm">
        <Link className="underline" href="/esqueci-senha">
          Esqueci minha senha
        </Link>
        <Link className="underline" href="/configurar-2fa">
          Configurar 2FA
        </Link>
      </div>
    </form>
  );
}
