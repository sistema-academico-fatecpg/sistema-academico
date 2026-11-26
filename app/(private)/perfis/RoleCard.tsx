"use client";

import { PermissionPicker } from "./PermissionPicker";
import type { RoleItem } from "./types";

export function RoleCard({
  role,
  onSubmit,
}: {
  role: RoleItem;
  onSubmit: (role: RoleItem) => void;
}) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
        <PermissionPicker role={role} onSubmit={onSubmit} />
      </details>
    </details>
  );
}
