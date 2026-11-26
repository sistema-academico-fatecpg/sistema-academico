import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

/** Faixa de aviso/informação usada em aprovações, responsabilidades etc. */
export function AlertBanner({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    info: "border-slate-200 bg-slate-50 text-slate-600",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-rose-300 bg-rose-50 text-rose-900",
  };
  return (
    <div className={cn("rounded-2xl border p-5", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? (
        <div className={cn("text-sm leading-6", title ? "mt-1" : "")}>{children}</div>
      ) : null}
    </div>
  );
}
