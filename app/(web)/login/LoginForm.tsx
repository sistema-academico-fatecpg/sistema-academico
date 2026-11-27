"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FormFeedback } from "@/components";
import { authClient } from "@/web/lib/auth/client";
import { CredentialsStep } from "./CredentialsStep";
import styles from "./form.module.scss";
import { PrivacyNote } from "./PrivacyNote";
import { TotpStep } from "./TotpStep";

export function LoginForm({ dpoEmail }: { dpoEmail: string }) {
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
        setError(
          result.error.code === "INVALID_CODE"
            ? "Código inválido. Verifique a data/hora do aparelho. Se a chave foi alterada, use um código de recuperação ou procure a secretaria."
            : (result.error.message ?? "Código inválido"),
        );
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
    <form className={styles.form} onSubmit={onSubmit}>
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

      <Button className={styles.submit} disabled={loading} type="submit">
        {loading ? "Verificando..." : needsTotp ? "Confirmar código" : "Entrar"}
      </Button>

      <div className={styles.links}>
        <Link href="/esqueci-senha">Esqueci minha senha</Link>
        <Link href="/configurar-2fa">Configurar 2FA</Link>
      </div>
      <PrivacyNote email={dpoEmail} />
    </form>
  );
}
