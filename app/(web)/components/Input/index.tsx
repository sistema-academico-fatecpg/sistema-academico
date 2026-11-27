"use client";

import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function InputComponent({ className, type, error, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(styles.inputBase, error && styles.inputError, className)}
      {...props}
    />
  );
}

export { InputComponent as Input };
