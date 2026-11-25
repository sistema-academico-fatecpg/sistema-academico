export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { RoleRepository } from "@/app/repositories/role.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { RolesPanel } from "./RolesPanel";

export const metadata: Metadata = { title: "Perfis e permissões" };

export default async function Page() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  if (!actor.permissions.has(PERMISSIONS.ROLES_CREATE)) redirect("/dashboard");

  const roles = await new RoleRepository().listAll();
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Perfis e permissões
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Perfis novos nascem sem permissões (7.2). Qualquer concessão ou revogação de permissões
          administrativas gera solicitação de dupla aprovação (7.5.4) e alerta ao Auditor (10.6).
        </p>
      </div>
      <RolesPanel
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions.map((item) => item.permission.name),
        }))}
      />
    </section>
  );
}
