"use client";

import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function LabelComponent({ className, ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: o htmlFor é repassado pelo consumidor
    <label className={cn(styles.label, className)} {...props} />
  );
}

export { LabelComponent as Label };
