"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/app/lib/auth/client";
import { Button, FormFeedback } from "@/components/ui";
import { CredentialsStep } from "./CredentialsStep";
import { PrivacyNote } from "./PrivacyNote";
import { TotpStep } from "./TotpStep";

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
        <TotpStep
          code={code}
          onCode={setCode}
          onToggleMode={() => {
            setUseRecoveryCode((current) => !current);
            setCode("");
            setError(null);
          }}
          useRecoveryCode={useRecoveryCode}
        />
      ) : (
        <CredentialsStep
          email={email}
          onEmail={setEmail}
          onPassword={setPassword}
          password={password}
        />
      )}

      <FormFeedback error={error} />

      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Verificando..." : needsTotp ? "Confirmar código" : "Entrar"}
      </Button>

      <div className="flex justify-between text-sm">
        <Link className="underline" href="/esqueci-senha">
          Esqueci minha senha
        </Link>
        <Link className="underline" href="/configurar-2fa">
          Configurar 2FA
        </Link>
      </div>
      <PrivacyNote />
    </form>
  );
}
