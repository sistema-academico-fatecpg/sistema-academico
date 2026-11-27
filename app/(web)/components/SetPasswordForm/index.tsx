"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePendingTotpSetup } from "@/app/lib/auth/totp-setup";
import { Button, Field, FormFeedback, PageHeader } from "@/components";
import { authClient } from "@/web/lib/auth/client";
import styles from "./styles.module.scss";

export type SetPasswordMode = "activation" | "reset";

export interface SetPasswordFormProps {
  token: string;
  mode: SetPasswordMode;
  /** Código de confirmação enviado por e-mail (ativação ou redefinição). */
  code?: string;
}

/**
 * Tela única para definir a senha: ativação inicial ou redefinição solicitada
 * pela secretaria. A política impede que a senha seja definida por administrador.
 */
export function SetPasswordForm({ token, mode, code: initialCode = "" }: SetPasswordFormProps) {
  const isActivation = mode === "activation";
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string[] | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <PageHeader
        description="O link está incompleto. Solicite um novo link à secretaria."
        eyebrow="Sistema Acadêmico"
        title="Link inválido"
      />
    );
  }

  const passwordAction = {
    iconName: showPassword ? "close" : "view",
    label: showPassword ? "Ocultar senha" : "Mostrar senha",
    onClick: () => setShowPassword((visible) => !visible),
  };

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(["As senhas não conferem."]);
      return;
    }

    setLoading(true);
    if (!isActivation) {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, code, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: Array<{ message?: string } | string>;
      };
      setLoading(false);
      if (!response.ok) {
        setError(
          Array.isArray(data.details)
            ? data.details.map((item) => (typeof item === "string" ? item : (item.message ?? "")))
            : [data.error ?? "Falha ao redefinir a senha"],
        );
        return;
      }
      setDone(true);
      return;
    }

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
          description={
            isActivation
              ? "Sua senha foi definida e você já está autenticado. Para alunos, o segundo fator é opcional."
              : "Todas as sessões anteriores foram encerradas."
          }
          eyebrow="Sistema Acadêmico"
          title={isActivation ? "Conta ativada" : "Senha redefinida"}
        />
        {isActivation ? (
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
        ) : (
          <Button iconName="next" onClick={() => router.push("/login")} type="button">
            Entrar
          </Button>
        )}
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <PageHeader
        description={
          isActivation
            ? "Crie sua própria senha. O código de 6 dígitos veio junto com o link e já foi preenchido; ele continua sendo conferido no servidor."
            : "A redefinição foi solicitada pela secretaria e enviada ao seu e-mail pessoal. Crie uma nova senha: o link é de uso único, válido por 30 minutos, e o código de 6 dígitos veio junto com ele."
        }
        eyebrow="Sistema Acadêmico"
        title={isActivation ? "Ativação de conta" : "Definir nova senha"}
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
        action={passwordAction}
        label="Nova senha"
        minLength={12}
        onChange={(event) => setPassword(event.target.value)}
        required
        type={showPassword ? "text" : "password"}
        value={password}
      />
      <Field
        action={passwordAction}
        label="Confirme a nova senha"
        minLength={12}
        onChange={(event) => setConfirm(event.target.value)}
        required
        type={showPassword ? "text" : "password"}
        value={confirm}
      />
      <FormFeedback errors={error} />
      <Button className={styles.submit} disabled={loading} type="submit">
        {loading ? "Salvando..." : isActivation ? "Definir senha e ativar" : "Redefinir senha"}
      </Button>
      <p className={styles.footnote}>
        <Link href="/login">Já tenho conta: ir para o login</Link>
      </p>
    </form>
  );
}
