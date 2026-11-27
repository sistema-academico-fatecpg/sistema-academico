"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, FormFeedback } from "@/components";
import styles from "./styles.module.scss";

export function DecisionForm({
  requestId,
  requiresDirectionAuthorization = false,
}: {
  requestId: string;
  requiresDirectionAuthorization?: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [direction, setDirection] = useState("");
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "REJECT") {
    setLoading(decision);
    setError(null);
    const response = await fetch(`/api/critical-operations/${requestId}/decision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(direction ? { "x-direction-authorization": direction } : {}),
      },
      body: JSON.stringify({ decision, reason: reason || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(null);
    if (!response.ok) {
      setError(data.error ?? "Não foi possível registrar a decisão");
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.decision}>
      {requiresDirectionAuthorization ? (
        <Field
          aria-label="Documento de autorização da direção"
          label="Documento de autorização da direção"
          onChange={(event) => setDirection(event.target.value)}
          placeholder="Documento de autorização da direção (obrigatório)"
          value={direction}
        />
      ) : null}
      <Field
        aria-label="Observação da decisão"
        label="Observação da decisão"
        onChange={(event) => setReason(event.target.value)}
        placeholder="Observação (opcional)"
        value={reason}
      />
      <div className={styles.actions}>
        <Button
          disabled={loading !== null}
          iconName="check"
          onClick={() => decide("APPROVE")}
          type="button"
        >
          {loading === "APPROVE" ? "Aprovando..." : "Aprovar e executar"}
        </Button>
        <Button
          disabled={loading !== null}
          iconName="close"
          onClick={() => decide("REJECT")}
          type="button"
          variant="secondary"
        >
          {loading === "REJECT" ? "Recusando..." : "Recusar"}
        </Button>
      </div>
      <FormFeedback error={error} />
    </div>
  );
}
