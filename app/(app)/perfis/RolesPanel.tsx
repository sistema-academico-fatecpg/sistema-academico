"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
};

const ALL_PERMISSIONS = [
  "USERS:READ",
  "USERS:CREATE",
  "USERS:UPDATE",
  "ROLES:READ",
  "ROLES:CREATE",
  "ROLES:UPDATE",
  "ROLES:DELETE",
  "ROLES:APPROVE",
  "COURSES:READ",
  "COURSES:CREATE",
  "COURSES:UPDATE",
  "PERIODS:READ",
  "PERIODS:CREATE",
  "PERIODS:UPDATE",
  "SUBJECTS:READ",
  "SUBJECTS:CREATE",
  "SUBJECTS:UPDATE",
  "CLASSES:READ",
  "CLASSES:CREATE",
  "ENROLLMENTS:READ",
  "ENROLLMENTS:CREATE",
  "ENROLLMENTS:UPDATE",
  "ENROLLMENTS:EXPORT",
  "GRADES:READ",
  "GRADES:CREATE",
  "GRADES:UPDATE",
  "GRADES:EXPORT",
  "AUDIT_LOGS:READ",
  "AUDIT_LOGS:EXPORT",
  "BACKUPS:READ",
  "REPORTS:READ",
  "REPORTS:EXPORT",
];

export function RolesPanel({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível criar o perfil");
      return;
    }
    setMessage("Perfil criado sem permissões (7.2).");
    setName("");
    router.refresh();
  }

  async function requestPermissions(role: Role) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/roles/${role.id}/permissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        permissionNames: role.permissions,
        reason: `Revisão periódica das permissões do perfil ${role.name}`,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível solicitar a alteração");
      return;
    }
    setMessage(`Solicitação ${data.requestId} enviada para dupla aprovação.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={createRole}
      >
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setName(event.target.value.toUpperCase())}
          placeholder="NOVO_PERFIL (sem permissões)"
          required
          value={name}
        />
        <button
          className="rounded-lg bg-[#6b1720] px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Criar perfil vazio
        </button>
      </form>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="space-y-3">
        {roles.map((role) => (
          <details
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            key={role.id}
          >
            <summary className="cursor-pointer font-semibold text-slate-900">
              {role.name} — {role.permissions.length} permissão(ões)
            </summary>
            <p className="mt-2 text-sm text-slate-500">{role.description}</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600 md:grid-cols-4">
              {role.permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                Selecionar permissões para solicitar alteração
              </summary>
              <PermissionPicker role={role} onSubmit={requestPermissions} />
            </details>
          </details>
        ))}
      </div>
    </div>
  );
}

function PermissionPicker({ role, onSubmit }: { role: Role; onSubmit: (role: Role) => void }) {
  const [selected, setSelected] = useState<string[]>(role.permissions);
  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-1 text-xs md:grid-cols-4">
        {ALL_PERMISSIONS.map((permission) => (
          <label className="flex items-center gap-1" key={permission}>
            <input
              checked={selected.includes(permission)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, permission]
                    : current.filter((item) => item !== permission),
                )
              }
              type="checkbox"
            />
            {permission}
          </label>
        ))}
      </div>
      <button
        className="rounded-lg border border-[#6b1720] px-3 py-2 text-xs font-semibold text-[#6b1720]"
        onClick={() => onSubmit({ ...role, permissions: selected })}
        type="button"
      >
        Solicitar dupla aprovação
      </button>
    </div>
  );
}
