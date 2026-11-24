"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcknowledgeButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function acknowledge() {
    setLoading(true);
    await fetch(`/api/audit/alerts/${id}/acknowledge`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }
  return (
    <button
      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
      disabled={loading}
      onClick={acknowledge}
      type="button"
    >
      {loading ? "..." : "Reconhecer"}
    </button>
  );
}
