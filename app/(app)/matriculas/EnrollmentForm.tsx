"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClassGroupDto } from "@/app/types/academic";

export function EnrollmentForm({ items }: { items: ClassGroupDto[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ classGroupIds: selected }),
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
    <div className="space-y-3">
      {items.map((item) => (
        <label
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            item.hasConflict ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
          }`}
          key={item.id}
        >
          <input
            className="mt-1"
            disabled={item.hasConflict}
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
          <span className="text-sm">
            <span className="font-semibold">
              {item.subjectCode} — {item.subjectName}
            </span>
            <span className="ml-2 text-xs text-slate-500">
              {item.isDependency ? "DP obrigatória" : `Período ${item.periodNumber}`}
            </span>
            {item.hasConflict ? (
              <span className="mt-1 block text-xs font-semibold text-rose-700">
                Bloqueada: conflito de horário com a DP.
              </span>
            ) : null}
          </span>
        </label>
      ))}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <button
        className="rounded-lg bg-[#6b1720] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={selected.length === 0}
        onClick={submit}
        type="button"
      >
        Confirmar matrícula
      </button>
    </div>
  );
}
