"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClassGroupDto } from "@/app/types/academic";
import { Button, Field, FormFeedback } from "@/components";
import styles from "./styles.module.scss";

export function EnrollmentForm({ items }: { items: ClassGroupDto[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    // 9.1.2: a DP é sempre enviada antes das demais, independentemente da
    // ordem em que o aluno marcou as caixas na tela.
    const ordered = [...selected].sort((a, b) => {
      const aDp = items.find((item) => item.id === a)?.isDependency ? 0 : 1;
      const bDp = items.find((item) => item.id === b)?.isDependency ? 0 : 1;
      return aDp - bDp;
    });
    const response = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ classGroupIds: ordered }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível confirmar a matrícula");
      return;
    }
    setMessage("Matrícula registrada.");
    setSelected([]);
    router.refresh();
  }

  return (
    <div className={styles.form}>
      {items.map((item) => (
        <div
          className={item.hasConflict ? `${styles.option} ${styles.optionConflict}` : styles.option}
          key={item.id}
        >
          <Field
            checked={selected.includes(item.id)}
            disabled={item.hasConflict}
            error={item.hasConflict ? "Bloqueada: conflito de horário com a DP." : null}
            hint={item.isDependency ? "DP obrigatória" : `Período ${item.periodNumber}`}
            label={`${item.subjectCode} — ${item.subjectName}`}
            onChange={(event) =>
              setSelected((current) =>
                event.target.checked
                  ? [...current, item.id]
                  : current.filter((id) => id !== item.id),
              )
            }
            type="checkbox"
            value={item.id}
          />
        </div>
      ))}
      <FormFeedback error={error} message={message} />
      <div className={styles.actions}>
        <Button disabled={selected.length === 0} iconName="check" onClick={submit} type="button">
          Confirmar matrícula
        </Button>
      </div>
    </div>
  );
}
