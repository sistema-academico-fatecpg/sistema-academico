"use client";

import { cn } from "@/app/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function InputComponent({ className, type, error, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-50",
        error && "border-rose-400",
        className,
      )}
      {...props}
    />
  );
}

export { InputComponent as Input };
