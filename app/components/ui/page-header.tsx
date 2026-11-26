import type { ReactNode } from "react";

/**
 * Cabeçalho padrão das páginas. Antes o mesmo bloco (eyebrow + h1 +
 * descrição) estava copiado em 14 arquivos.
 */
export function PageHeader({
  title,
  description,
  eyebrow = "Módulo institucional",
  action,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
