"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, FormFeedback, Label, Panel } from "@/components";
import styles from "./styles.module.scss";

export function IncidentPanel() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function report(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description, severity: "HIGH", involvesMaster: false }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível registrar o incidente");
      return;
    }
    setMessage("Incidente registrado; Admin Master e Auditor foram alertados.");
    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      <Panel as="form" padding="p-5" className={styles.form} onSubmit={report}>
        <h2 className={styles.sectionTitle}>Registrar incidente</h2>
        <Field
          label="Título"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Título"
          required
          value={title}
        />
        <Label>
          Descrição
          <textarea
            className={styles.textarea}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição"
            required
            value={description}
          />
        </Label>
        <Button type="submit">Comunicar</Button>
      </Panel>
      <FormFeedback error={error} message={message} />
      <p className={styles.note}>
        O avanço do fluxo (conter, analisar, restaurar, notificar, encerrar) é feito pelas rotas
        `/api/incidents/:id/:action`, com as condições de 13.2 validadas no servidor.
      </p>
    </div>
  );
}
