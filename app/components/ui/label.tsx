"use client";

import { cn } from "@/app/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function LabelComponent({ className, ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: o htmlFor é repassado pelo consumidor
    <label className={cn("block text-sm font-medium text-slate-700", className)} {...props} />
  );
}

export { LabelComponent as Label };
