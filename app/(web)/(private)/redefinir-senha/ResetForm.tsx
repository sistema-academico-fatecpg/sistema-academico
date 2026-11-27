"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, FormFeedback, PageHeader } from "@/components";
import styles from "./styles.module.scss";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string[] | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(["As senhas não conferem."]);
      return;
    }
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(Array.isArray(data.details) ? data.details : [data.error ?? "Falha ao redefinir"]);
      return;
    }
    setDone(true);
  }

  if (!token) {
    return <FormFeedback error="Link inválido ou incompleto." />;
  }

  if (done) {
    return (
      <div className={styles.state}>
        <PageHeader
          description="Todas as sessões anteriores foram encerradas."
          eyebrow="Sistema Acadêmico"
          title="Senha redefinida"
        />
        <Link className={styles.link} href="/login">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <PageHeader eyebrow="Sistema Acadêmico" title="Definir nova senha" />
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
      <Button className={styles.submit} type="submit">
        Redefinir senha
      </Button>
    </form>
  );
}
