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
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (needsTotp) {
      const result = useRecoveryCode
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code });
      setLoading(false);
      if (result.error) {
        setError(result.error.message ?? "Código inválido");
        return;
      }
      if (useRecoveryCode) {
        const consumed = await fetch("/api/auth/mfa/consume", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!consumed.ok) {
          setError("Código de recuperação já utilizado; solicite outro à secretaria.");
          return;
        }
      }
      router.push("/");
      router.refresh();
      return;
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError("Credenciais inválidas.");
      return;
    }
    if (data.twoFactorRedirect) {
      setNeedsTotp(true);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Entrar</h1>
      <p className="text-sm text-zinc-600">
        Acesso com e-mail institucional e senha. Perfis administrativos usam segundo fator (TOTP).
      </p>

      {needsTotp ? (
        <>
          <label className="block text-sm font-medium">
            {useRecoveryCode ? "Código de recuperação" : "Código do autenticador"}
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 tracking-widest"
              inputMode={useRecoveryCode ? "text" : "numeric"}
              maxLength={useRecoveryCode ? 20 : 6}
              onChange={(event) =>
                setCode(
                  useRecoveryCode ? event.target.value : event.target.value.replace(/\D/g, ""),
                )
              }
              required
              value={code}
            />
          </label>
          <button
            className="text-sm underline"
            onClick={() => {
              setUseRecoveryCode((current) => !current);
              setCode("");
              setError(null);
            }}
            type="button"
          >
            {useRecoveryCode
              ? "Usar o aplicativo autenticador"
              : "Perdi o celular: usar código de recuperação"}
          </button>
        </>
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
      <p className="border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">
        Ao entrar, você declara ciência do{" "}
        <Link className="underline" href="/privacidade">
          Aviso de Privacidade
        </Link>
        . Encarregado de Dados:{" "}
        <a className="underline" href="mailto:dpo@fatecpg.edu.br">
          dpo@fatecpg.edu.br
        </a>
        .
      </p>
    </form>
  );
}
