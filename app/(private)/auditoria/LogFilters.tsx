import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

const FIELDS = [
  { name: "from", label: "De", type: "date" },
  { name: "to", label: "Até", type: "date" },
  { name: "userId", label: "Usuário (id)", type: "text" },
  { name: "module", label: "Módulo", type: "text" },
  { name: "action", label: "Ação", type: "text" },
] as const;

/** 10.4: filtros por período, usuário, módulo e tipo de ação. */
export function LogFilters({ raw }: { raw: Record<string, string> }) {
  return (
    <>
      <Panel as="form" padding="p-5" className="grid gap-3 md:grid-cols-6" method="get">
        {FIELDS.map((field) => (
          <label className="text-xs font-semibold text-slate-500" key={field.name}>
            {field.label}
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
              name={field.name}
              type={field.type}
            />
          </label>
        ))}
        <Button className="mt-5" type="submit">
          Filtrar
        </Button>
      </Panel>
      <div className="flex justify-end">
        <a
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          href={`/api/audit/export?${new URLSearchParams(raw).toString()}&format=csv`}
        >
          Exportar CSV
        </a>
      </div>
    </>
  );
}
