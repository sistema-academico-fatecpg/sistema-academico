"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePendingTotpSetup } from "@/app/lib/auth/totp-setup";
import { Button, Field, FormFeedback, PageHeader } from "@/components";
import { authClient } from "@/web/lib/auth/client";
import styles from "./styles.module.scss";

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
      <PageHeader
        description="O link de ativação está incompleto. Solicite um novo link à secretaria."
        eyebrow="Sistema Acadêmico"
        title="Link inválido"
      />
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
      details?: Array<{ message?: string } | string>;
    };
    setLoading(false);
    if (!response.ok) {
      setError(
        Array.isArray(data.details)
          ? data.details.map((item) => (typeof item === "string" ? item : (item.message ?? "")))
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
    setDone(true);
  }

  if (done) {
    return (
      <div className={styles.state}>
        <PageHeader
          description="Sua senha foi definida e você já está autenticado. Para alunos, o segundo fator é opcional."
          eyebrow="Sistema Acadêmico"
          title="Conta ativada"
        />
        <div className={styles.actions}>
          <Button iconName="next" onClick={() => router.push("/dashboard")} type="button">
            Entrar diretamente
          </Button>
          <Button
            disabled={loading}
            iconName="shield"
            onClick={() => void startTotpSetup()}
            type="button"
            variant="secondary"
          >
            {loading ? "Gerando chave..." : "Configurar autenticador (opcional)"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <PageHeader
        description="Crie sua própria senha. O código de 6 dígitos veio junto com o link e já foi preenchido; ele continua sendo conferido no servidor. A senha nunca é definida por administradores."
        eyebrow="Sistema Acadêmico"
        title="Ativação de conta"
      />
      <Field
        className={styles.codeField}
        inputMode="numeric"
        label="Código de confirmação"
        maxLength={6}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        required
        value={code}
      />
      <Field
        label="Nova senha"
        minLength={12}
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />
      <Field
        label="Confirme a nova senha"
        minLength={12}
        onChange={(event) => setConfirm(event.target.value)}
        required
        type="password"
        value={confirm}
      />
      <FormFeedback errors={error} />
      <Button className={styles.submit} disabled={loading} type="submit">
        {loading ? "Ativando..." : "Definir senha e ativar"}
      </Button>
      <p className={styles.footnote}>
        <Link href="/login">Já tenho conta: ir para o login</Link>
      </p>
    </form>
  );
}
