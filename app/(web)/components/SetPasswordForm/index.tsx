"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, FormFeedback, PageHeader } from "@/components";
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
 * pela secretaria. Depois de definir a senha, o titular vai para o login — a
 * configuração do TOTP acontece após o login, com sessão válida.
 */
export function SetPasswordForm({ token, mode, code: initialCode = "" }: SetPasswordFormProps) {
  const isActivation = mode === "activation";
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const newPasswordAction = {
    iconName: showNewPassword ? "close" : "view",
    label: showNewPassword ? "Ocultar senha" : "Mostrar senha",
    onClick: () => setShowNewPassword((visible) => !visible),
  };
  const confirmPasswordAction = {
    iconName: showConfirmPassword ? "close" : "view",
    label: showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação",
    onClick: () => setShowConfirmPassword((visible) => !visible),
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(["As senhas não conferem."]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        isActivation ? "/api/auth/activate" : "/api/auth/password-reset/confirm",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, code, password }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: Array<{ message?: string } | string>;
      };
      if (!response.ok) {
        setError(
          Array.isArray(data.details)
            ? data.details.map((item) => (typeof item === "string" ? item : (item.message ?? "")))
            : [data.error ?? (isActivation ? "Falha na ativação" : "Falha ao redefinir a senha")],
        );
        return;
      }
      setDone(true);
    } catch {
      setError(["Não foi possível completar a operação. Tente novamente."]);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={styles.state}>
        <PageHeader
          description="Entre com seu e-mail institucional para continuar. Perfis que exigem segundo fator serão levados à configuração do autenticador."
          eyebrow="Sistema Acadêmico"
          title={isActivation ? "Senha definida" : "Senha redefinida"}
        />
        <Button iconName="next" onClick={() => router.push("/login")} type="button">
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <PageHeader
        description={
          isActivation
            ? "Crie sua própria senha. O código de 6 dígitos veio junto com o link e já foi preenchido; ele continua sendo conferido no servidor."
            : "A redefinição foi solicitada pela secretaria. Crie uma nova senha com o código enviado ao seu e-mail pessoal."
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
        action={newPasswordAction}
        label="Nova senha"
        minLength={12}
        onChange={(event) => setPassword(event.target.value)}
        required
        type={showNewPassword ? "text" : "password"}
        value={password}
      />
      <Field
        action={confirmPasswordAction}
        label="Confirme a nova senha"
        minLength={12}
        onChange={(event) => setConfirm(event.target.value)}
        required
        type={showConfirmPassword ? "text" : "password"}
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
