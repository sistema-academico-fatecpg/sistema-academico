"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/app/lib/auth/client";

export function SetupForm() {
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function enable(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const result = await authClient.twoFactor.enable({ password });
    if (result.error) {
      setError(result.error.message ?? "Não foi possível iniciar a configuração");
      return;
    }
    if (result.data?.method !== "totp") {
      setError("Método de segundo fator não suportado");
      return;
    }
    setTotpURI(result.data.totpURI);
    setBackupCodes(result.data.backupCodes);
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const result = await authClient.twoFactor.verifyTotp({ code });
    if (result.error) {
      setError(result.error.message ?? "Código inválido");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Segundo fator ativado</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Guarde os códigos de recuperação em local seguro. Cada código pode ser usado uma vez.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-4 font-mono text-sm">
          {backupCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link className="mt-6 inline-block font-medium underline" href="/">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (totpURI) {
    return (
      <form className="space-y-4" onSubmit={confirm}>
        <h1 className="text-xl font-semibold">Confirmar autenticador</h1>
        <p className="text-sm text-zinc-600">
          Cadastre a chave abaixo no aplicativo autenticador e informe o código gerado.
        </p>
        <code className="block break-all rounded-lg bg-zinc-100 p-3 text-xs">{totpURI}</code>
        <label className="block text-sm font-medium">
          Código de 6 dígitos
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 tracking-widest"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            required
            value={code}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white"
          type="submit"
        >
          Confirmar código
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={enable}>
      <h1 className="text-xl font-semibold">Configurar segundo fator</h1>
      <p className="text-sm text-zinc-600">
        Perfis administrativos, professores, auditores e suporte técnico exigem TOTP. Confirme sua
        senha para gerar a chave.
      </p>
      <label className="block text-sm font-medium">
        Senha atual
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white"
        type="submit"
      >
        Gerar chave TOTP
      </button>
    </form>
  );
}
