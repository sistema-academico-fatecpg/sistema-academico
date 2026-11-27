export const instant = false;

import { requirePageUser } from "@/app/lib/auth/page-guard";
import { Badge, PageHeader } from "@/components";
import { ROLE_LABELS } from "@/web/lib/labels";
import { DASHBOARD_CARDS } from "./cards";
import { DashboardCard } from "./DashboardCard";
import styles from "./page.module.scss";

export default async function DashboardPage() {
  const actor = await requirePageUser();
  const visible = DASHBOARD_CARDS.filter((card) =>
    card.roles.some((role) => actor.roles.includes(role)),
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Painel institucional"
        title={`Olá, ${actor.user.socialName || actor.name}.`}
        description="Acesse os módulos disponíveis conforme seus perfis e permissões institucionais."
      />
      <div className={styles.roles}>
        {actor.roles.map((role) => (
          <Badge key={role}>{ROLE_LABELS[role] ?? role.replaceAll("_", " ")}</Badge>
        ))}
      </div>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Seus módulos</h2>
            <p>Módulos liberados para os seus perfis de acesso.</p>
          </div>
          <span className={styles.count}>{visible.length} disponíveis</span>
        </div>
        <div className={styles.grid}>
          {visible.map((card) => (
            <DashboardCard card={card} key={card.href} />
          ))}
        </div>
      </section>
    </div>
  );
}
