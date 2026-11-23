export const instant = false;

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import type { RoleName } from "@/app/types/common";
import { hasPermission, PERMISSIONS } from "@/app/types/roles";
import { CreateUserForm } from "./CreateUserForm";

export default async function NewUserPage() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  if (!hasPermission(actor.roles, PERMISSIONS.USERS_CREATE)) redirect("/");

  const creatableRoles: RoleName[] = actor.roles.includes("ADMIN_MASTER")
    ? ["ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"]
    : ["PROFESSOR", "ALUNO"];

  return (
    <section>
      <h1 className="text-2xl font-semibold">Novo usuário</h1>
      <div className="mt-6">
        <CreateUserForm creatableRoles={creatableRoles} />
      </div>
    </section>
  );
}
