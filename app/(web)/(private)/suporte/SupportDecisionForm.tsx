"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, FormFeedback } from "@/components";
import styles from "./styles.module.scss";

export function SupportDecisionForm({
  grantId,
  involvesAuditor,
}: {
  grantId: string;
  involvesAuditor: boolean;
}) {
  const router = useRouter();
  const [direction, setDirection] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "REJECT") {
    setError(null);
    const response = await fetch(`/api/support/access/${grantId}/decision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(direction ? { "x-direction-authorization": direction } : {}),
      },
      body: JSON.stringify({ decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível decidir");
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.decision}>
      {involvesAuditor ? (
        <Field
          aria-label="Autorização da direção"
          label="Autorização da direção"
          onChange={(event) => setDirection(event.target.value)}
          placeholder="Documento de autorização da direção"
          value={direction}
        />
      ) : null}
      <div className={styles.actions}>
        <Button iconName="check" onClick={() => decide("APPROVE")} size="sm" type="button">
          Aprovar
        </Button>
        <Button
          iconName="close"
          onClick={() => decide("REJECT")}
          size="sm"
          type="button"
          variant="secondary"
        >
          Recusar
        </Button>
      </div>
      <FormFeedback error={error} />
    </div>
  );
}
