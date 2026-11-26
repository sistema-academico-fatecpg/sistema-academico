"use client";

import { cn } from "@/app/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm";
  isLoading?: boolean;
}

/**
 * Botão padrão do sistema. Antes existia uma versão shadcn com `bg-primary`
 * (variável não definida em globals.css) que nenhuma página usava.
 */
export function Button({
  className,
  variant = "default",
  size = "default",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    default: "bg-[#6b1720] text-white hover:bg-[#501018]",
    outline: "border border-rose-300 text-rose-800 hover:bg-rose-50",
    ghost: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    destructive: "bg-rose-700 text-white hover:bg-rose-800",
  };
  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Aguarde..." : children}
    </button>
  );
}
