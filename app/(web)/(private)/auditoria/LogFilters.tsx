import { Button, Field, Panel } from "@/components";
import styles from "./styles.module.scss";

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
      <Panel as="form" padding="p-5" className={styles.filters} method="get">
        {FIELDS.map((field) => (
          <Field key={field.name} label={field.label} name={field.name} type={field.type} />
        ))}
        <Button className={styles.submit} type="submit">
          Filtrar
        </Button>
      </Panel>
      <div className={styles.exportRow}>
        <a
          className={styles.exportLink}
          href={`/api/audit/export?${new URLSearchParams(raw).toString()}&format=csv`}
        >
          Exportar CSV
        </a>
      </div>
    </>
  );
}
