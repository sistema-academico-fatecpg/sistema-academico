"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DecisionForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "REJECT") {
    setLoading(decision);
    setError(null);
    const response = await fetch(`/api/critical-operations/${requestId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
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
    <div className="mt-3 space-y-2">
      <input
        aria-label="Observação da decisão"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => setReason(event.target.value)}
        placeholder="Observação (opcional)"
        value={reason}
      />
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={loading !== null}
          onClick={() => decide("APPROVE")}
          type="button"
        >
          {loading === "APPROVE" ? "Aprovando..." : "Aprovar e executar"}
        </button>
        <button
          className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50"
          disabled={loading !== null}
          onClick={() => decide("REJECT")}
          type="button"
        >
          {loading === "REJECT" ? "Recusando..." : "Recusar"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
