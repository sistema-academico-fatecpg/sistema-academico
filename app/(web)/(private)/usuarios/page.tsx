export const instant = false;

import Link from "next/link";
import { visibleRolesFor } from "@/app/lib/auth/account-service";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { UserRepository } from "@/app/repositories/user.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { DataTable, Icon, PageHeader } from "@/components";
import styles from "./styles.module.scss";

export default async function UsersPage() {
  const actor = await requirePagePermission(PERMISSIONS.USERS_READ);

  const { items } = await new UserRepository().list(
    { page: 1, pageSize: 100 },
    actor.roles.includes("ADMIN_MASTER") ? null : visibleRolesFor(actor.roles),
  );

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Usuários"
        description="A visão respeita o perfil do solicitante; perfis administrativos não aparecem para a secretaria."
        action={
          <Link className={styles.createLink} href="/usuarios/novo">
            <Icon name="add" size="sm" /> Cadastrar usuário
          </Link>
        }
      />
      <DataTable
        columns={[
          { key: "name", header: "Nome" },
          { key: "email", header: "E-mail" },
          {
            key: "roles",
            header: "Perfil",
            render: (user) => user.roles.map((role) => role.role.name).join(", "),
          },
          { key: "status", header: "Status" },
        ]}
        rows={items}
        rowKey={(user) => user.id}
        emptyMessage="Nenhum usuário visível para o seu perfil."
      />
    </section>
  );
}
