import type { ReactNode } from "react";
import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

/** Faixa de aviso/informação. */
export function AlertBanner({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children?: ReactNode;
}) {
  const TONE_CLASS: Record<"info" | "warning" | "success" | "danger", string> = {
    info: styles.toneInfo,
    warning: styles.toneWarning,
    success: styles.toneSuccess,
    danger: styles.toneDanger,
  };
  return (
    <div className={cn(styles.alertBase, TONE_CLASS[tone])}>
      {title ? <p className={styles.alertTitle}>{title}</p> : null}
      {children ? (
        <div className={cn(styles.alertBody, title && styles.alertBodyWithTitle)}>{children}</div>
      ) : null}
    </div>
  );
}
