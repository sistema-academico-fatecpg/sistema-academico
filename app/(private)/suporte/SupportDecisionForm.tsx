"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormFeedback } from "@/components/ui/form-feedback";

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
    <div className="mt-3 space-y-2">
      {involvesAuditor ? (
        <input
          aria-label="Autorização da direção"
          className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm"
          onChange={(event) => setDirection(event.target.value)}
          placeholder="Documento de autorização da direção"
          value={direction}
        />
      ) : null}
      <div className="flex gap-2">
        <button
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
          onClick={() => decide("APPROVE")}
          type="button"
        >
          Aprovar
        </button>
        <button
          className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-800"
          onClick={() => decide("REJECT")}
          type="button"
        >
          Recusar
        </button>
      </div>
      <FormFeedback error={error} />
    </div>
  );
}
