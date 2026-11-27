export const instant = false;

import { requirePagePermission } from "@/app/lib/auth/page-guard";
import type { RoleName } from "@/app/types/common";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader, RegisterForm } from "@/components";
import styles from "./styles.module.scss";

export default async function NewUserPage() {
  const actor = await requirePagePermission(PERMISSIONS.USERS_CREATE);

  // 7.5.4/8.8: Admin Master também pode incluir outro Master (dupla aprovação).
  const creatableRoles: RoleName[] = actor.roles.includes("ADMIN_MASTER")
    ? ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"]
    : ["PROFESSOR", "ALUNO"];

  return (
    <section className={styles.page}>
      <PageHeader eyebrow="Administração" title="Novo usuário" />
      <RegisterForm creatableRoles={creatableRoles} />
    </section>
  );
}
