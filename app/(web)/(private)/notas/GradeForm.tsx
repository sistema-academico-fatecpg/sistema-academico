"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, FormFeedback } from "@/components";
import styles from "./styles.module.scss";

export function GradeForm({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/grades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enrollmentId, value: Number(value) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível lançar a nota");
      return;
    }
    setMessage("Nota registrada.");
    router.refresh();
  }

  return (
    <div className={styles.gradeForm}>
      <Field
        aria-label="Nota"
        label="Nota"
        max={10}
        min={0}
        onChange={(event) => setValue(event.target.value)}
        step={0.01}
        type="number"
        value={value}
      />
      <Button iconName="check" onClick={submit} size="sm" type="button">
        Lançar
      </Button>
      <div className={styles.feedback}>
        <FormFeedback error={error} message={message} />
      </div>
    </div>
  );
}
