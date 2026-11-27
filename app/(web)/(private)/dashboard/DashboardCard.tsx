import Link from "next/link";
import { Icon, type IconName } from "@/components";
import type { DashboardCardItem } from "./cards";
import styles from "./DashboardCard.module.scss";

const CARD_ICONS: Record<string, IconName> = {
  "/usuarios": "users",
  "/perfis": "security",
  "/cursos": "subjects",
  "/periodos": "calendar",
  "/disciplinas": "book",
  "/matriculas": "academic",
  "/notas": "grades",
  "/aprovacoes": "check",
  "/auditoria": "activity",
  "/suporte": "help",
  "/incidentes": "alert",
  "/relatorios": "report",
  "/responsabilidades": "shield",
};

export function DashboardCard({ card }: { card: DashboardCardItem }) {
  return (
    <Link href={card.href} className={styles.card}>
      <span className={styles.icon}>
        <Icon name={CARD_ICONS[card.href] ?? "dashboard"} />
      </span>
      <h3 className={styles.title}>{card.title}</h3>
      <p className={styles.description}>{card.description}</p>
    </Link>
  );
}
