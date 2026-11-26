import type { FormEventHandler, ReactNode } from "react";
import { cn } from "@/app/lib/utils";

type Padding = "p-0" | "p-4" | "p-5" | "p-6" | "p-8";

/** Painel branco padrão (antes copiado em 13 páginas). */
export function Panel({
  children,
  padding = "p-6",
  className,
  as = "div",
  method,
  onSubmit,
}: {
  children: ReactNode;
  padding?: Padding;
  className?: string;
  as?: "div" | "form" | "section";
  method?: "get" | "post";
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const classes = cn("rounded-2xl border border-slate-200 bg-white shadow-sm", padding, className);
  if (as === "form") {
    return (
      <form className={classes} method={method} onSubmit={onSubmit}>
        {children}
      </form>
    );
  }
  if (as === "section") {
    return <section className={classes}>{children}</section>;
  }
  return <div className={classes}>{children}</div>;
}
