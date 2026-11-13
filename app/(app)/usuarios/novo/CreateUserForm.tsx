"use client";

import { useState } from "react";
import type { RoleName } from "@/app/types/common";

const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN_MASTER: "Admin Master",
  ADMIN_SECUNDARIO: "Admin Secundário",
  PROFESSOR: "Professor",
  ALUNO: "Aluno",
  AUDITOR: "Auditor",
  SUPORTE_TECNICO: "Suporte Técnico",
};

export function CreateUserForm({ creatableRoles }: { creatableRoles: RoleName[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        registrationNumber: form.get("registrationNumber") || null,
        role: form.get("role"),
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(
        Array.isArray(data.details)
          ? data.details.map((item: { message: string }) => item.message)
          : [data.error],
      );
      return;
    }

    setMessage(
      data.status === "PENDING_APPROVAL"
        ? "Cadastro enviado para dupla aprovação do Admin Master."
        : "Usuário cadastrado. O link de ativação foi enviado ao titular; nenhuma senha foi definida por você.",
    );
    event.currentTarget.reset();
  }

  return (
    <form className="max-w-xl space-y-4" onSubmit={onSubmit}>
      <p className="text-sm text-zinc-600">
        O cadastro não possui campo de senha: a credencial pertence somente ao titular, que a define
        pelo link de ativação de uso único (24h).
      </p>
      <label className="block text-sm font-medium">
        Nome completo
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          name="name"
          required
        />
      </label>
      <label className="block text-sm font-medium">
        E-mail institucional
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block text-sm font-medium">
        Matrícula (opcional)
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          name="registrationNumber"
        />
      </label>
      <label className="block text-sm font-medium">
        Perfil
        <select
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          name="role"
          required
        >
          {creatableRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
      ) : null}
      <button
        className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? "Cadastrando..." : "Cadastrar e enviar ativação"}
      </button>
    </form>
  );
}
