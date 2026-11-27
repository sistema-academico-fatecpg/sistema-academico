"use client";

import { useState } from "react";
import { Button, Field, PageHeader } from "@/components";
import styles from "./styles.module.scss";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? data.message : "Não foi possível processar a solicitação agora.");
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <PageHeader
        description="Enviaremos um link de uso único, válido por 30 minutos. Por segurança, a resposta é a mesma exista ou não a conta."
        eyebrow="Sistema Acadêmico"
        title="Recuperar senha"
      />
      <Field
        label="E-mail institucional"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />
      {message ? <p className={styles.notice}>{message}</p> : null}
      <Button className={styles.submit} disabled={loading} type="submit">
        {loading ? "Enviando..." : "Enviar link"}
      </Button>
    </form>
  );
}
