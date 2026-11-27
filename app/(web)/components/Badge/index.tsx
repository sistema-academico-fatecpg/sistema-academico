import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "neutral" | "danger";
}

const VARIANT_CLASS: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: styles.badgeDefault,
  success: styles.badgeSuccess,
  neutral: styles.badgeNeutral,
  danger: styles.badgeDanger,
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <span className={cn(styles.badgeBase, VARIANT_CLASS[variant], className)} {...props} />;
}
