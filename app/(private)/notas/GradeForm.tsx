"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="flex items-center gap-2">
      <input
        aria-label="Nota"
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
        max={10}
        min={0}
        onChange={(event) => setValue(event.target.value)}
        step={0.01}
        type="number"
        value={value}
      />
      <button
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
        onClick={submit}
        type="button"
      >
        Lançar
      </button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
      {message ? <span className="text-xs text-emerald-700">{message}</span> : null}
    </div>
  );
}
