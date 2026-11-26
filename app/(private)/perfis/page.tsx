export const instant = false;

import type { Metadata } from "next";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { RoleRepository } from "@/app/repositories/role.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader } from "@/components/ui";
import { RolesPanel } from "./RolesPanel";

export const metadata: Metadata = { title: "Perfis e permissões" };

export default async function Page() {
  await requirePagePermission(PERMISSIONS.ROLES_CREATE);

  const roles = await new RoleRepository().listAll();
  return (
    <section className="space-y-6">
      <PageHeader
        title="Perfis e permissões"
        description="Perfis novos nascem sem permissões (7.2). Qualquer concessão ou revogação de permissões administrativas gera solicitação de dupla aprovação (7.5.4) e alerta ao Auditor (10.6)."
      />
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
