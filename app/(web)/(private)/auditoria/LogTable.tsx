import { DataTable } from "@/components";
import styles from "./styles.module.scss";

type LogRow = Record<string, unknown>;

const cell = (value: unknown) => String(value ?? "—");

export function LogTable({ items }: { items: readonly unknown[] }) {
  return (
    <DataTable<LogRow>
      tableClassName={styles.logTable}
      columns={[
        { key: "createdAt", header: "Data", render: (row) => cell(row.createdAt) },
        { key: "userId", header: "Usuário", render: (row) => cell(row.userId) },
        { key: "action", header: "Ação", render: (row) => cell(row.action) },
        { key: "module", header: "Módulo", render: (row) => cell(row.module) },
        { key: "result", header: "Resultado", render: (row) => cell(row.result) },
      ]}
      rows={items as LogRow[]}
      rowKey={(row) => String(row.id)}
      emptyMessage="Nenhum registro encontrado para os filtros."
    />
  );
}
