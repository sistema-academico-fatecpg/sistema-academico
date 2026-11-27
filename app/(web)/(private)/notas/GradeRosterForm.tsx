"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import type { ProfessorRosterItem } from "@/app/lib/academic/grade-service";
import { Button, DataTable, Field, FormFeedback } from "@/components";
import styles from "./styles.module.scss";

function originalValue(grade: number | null): string {
  return grade === null ? "" : String(grade);
}

export function GradeRosterForm({ roster }: { roster: ProfessorRosterItem[] }) {
  const router = useRouter();
  const originalValues = useMemo(
    () => Object.fromEntries(roster.map((row) => [row.enrollmentId, originalValue(row.grade)])),
    [roster],
  );
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...originalValues }));
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Campos vazios nunca são enviados: o servidor não aceita remoção de nota.
  const pendingRows = roster.filter((row) => {
    const value = values[row.enrollmentId] ?? "";
    return value.trim() !== "" && Number(value) !== row.grade;
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || pendingRows.length === 0) return;

    setIsLoading(true);
    setMessage(null);
    setErrors([]);

    const collectedErrors: string[] = [];
    let saved = 0;

    for (const row of pendingRows) {
      const value = Number(values[row.enrollmentId]);
      if (!Number.isFinite(value) || value < 0 || value > 10) {
        collectedErrors.push(
          `Nota inválida para ${row.studentName}: informe um valor entre 0 e 10.`,
        );
        continue;
      }
      try {
        const response = await fetch("/api/grades", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enrollmentId: row.enrollmentId, value }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          saved += 1;
        } else {
          collectedErrors.push(
            `${row.studentName}: ${data.error ?? "Não foi possível lançar a nota"}`,
          );
        }
      } catch {
        collectedErrors.push(`${row.studentName}: Não foi possível lançar a nota`);
      }
    }

    setErrors(collectedErrors);
    if (saved > 0) {
      setMessage(`${saved} ${saved === 1 ? "nota registrada" : "notas registradas"}.`);
    }
    setIsLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <DataTable
        columns={[
          { key: "studentName", header: "Aluno" },
          {
            key: "registrationNumber",
            header: "Matrícula",
            render: (row) => row.registrationNumber ?? "—",
          },
          { key: "grade", header: "Nota", render: (row) => row.grade ?? "-" },
          {
            key: "launch",
            header: "Lançamento",
            render: (row) => (
              <div className={styles.gradeForm}>
                <Field
                  aria-label={`Nota de ${row.studentName}`}
                  label="Nota"
                  max={10}
                  min={0}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [row.enrollmentId]: event.target.value }))
                  }
                  step={0.01}
                  type="number"
                  value={values[row.enrollmentId] ?? ""}
                />
              </div>
            ),
          },
        ]}
        rows={roster}
        rowKey={(row) => row.enrollmentId}
        emptyMessage="Nenhum aluno nesta turma."
      />
      <div className={styles.saveBar}>
        <Button
          disabled={pendingRows.length === 0}
          iconName="check"
          isLoading={isLoading}
          type="submit"
        >
          Salvar notas
        </Button>
      </div>
      <div className={styles.feedback}>
        <FormFeedback errors={errors} message={message} />
      </div>
    </form>
  );
}
