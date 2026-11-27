import type { ReactNode } from "react";
import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

export type Column<Row> = {
  key: string;
  header: string;
  render?: (row: Row) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

/** Tabela padrão de dados. */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Nenhum registro.",
  tableClassName,
}: {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row, index: number) => string;
  emptyMessage?: string;
  tableClassName?: string;
}) {
  return (
    <div className={styles.tableWrapper}>
      <table className={cn(styles.table, tableClassName)}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((column) => (
              <th className={cn(styles.th, column.headerClassName)} key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {rows.map((row, index) => (
            <tr className={styles.tr} key={rowKey(row, index)}>
              {columns.map((column) => (
                <td className={cn(styles.td, column.cellClassName)} key={column.key}>
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr className={styles.tr}>
              <td className={styles.emptyTd} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
