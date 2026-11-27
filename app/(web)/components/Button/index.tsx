"use client";

import { cn } from "@/web/lib/utils";
import { Icon, type IconName, type IconProps } from "../Icon";
import styles from "./styles.module.scss";

export const ButtonVariants = ["primary", "secondary", "tertiary"] as const;
export type ButtonVariant = (typeof ButtonVariants)[number];

export const ButtonSizes = ["md", "sm"] as const;
export type ButtonSize = (typeof ButtonSizes)[number];

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone padronizado pelo adaptador de ícones. */
  iconName?: IconName | string;
  iconSize?: IconProps["size"];
  isLoading?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  tertiary: styles.btnTertiary,
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: styles.btnMd,
  sm: styles.btnSm,
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  iconName,
  iconSize = "md",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(styles.btnBase, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Aguarde…" : iconName ? <Icon name={iconName} size={iconSize} /> : null}
      {isLoading ? null : children}
    </button>
  );
}
