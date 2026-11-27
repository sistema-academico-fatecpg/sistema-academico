import type { ReactNode } from "react";
import styles from "./styles.module.scss";

export function PageHeader({
  title,
  description,
  eyebrow = "Módulo institucional",
  action,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
