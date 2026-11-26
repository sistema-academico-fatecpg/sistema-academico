export const instant = false;

import { requirePagePermission } from "@/app/lib/auth/page-guard";
import type { RoleName } from "@/app/types/common";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader } from "@/components/ui";
import { CreateUserForm } from "./CreateUserForm";

export default async function NewUserPage() {
  const actor = await requirePagePermission(PERMISSIONS.USERS_CREATE);

  const creatableRoles: RoleName[] = actor.roles.includes("ADMIN_MASTER")
    ? ["ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"]
    : ["PROFESSOR", "ALUNO"];

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Administração" title="Novo usuário" />
      <CreateUserForm creatableRoles={creatableRoles} />
    </section>
  );
}
