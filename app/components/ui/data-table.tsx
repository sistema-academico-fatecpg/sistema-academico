import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

export type Column<Row> = {
  key: string;
  header: string;
  render?: (row: Row) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

/**
 * Tabela padrão. Antes o mesmo markup (thead/tbody/`px-4 py-3`) aparecia em
 * 6 páginas, com 40 células idênticas.
 */
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
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className={cn("w-full text-left text-sm", tableClassName)}>
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((column) => (
              <th className={cn("px-4 py-3", column.headerClassName)} key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className="border-t border-slate-100" key={rowKey(row, index)}>
              {columns.map((column) => (
                <td className={cn("px-4 py-3", column.cellClassName)} key={column.key}>
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr className="border-t border-slate-100">
              <td className="px-4 py-6 text-slate-500" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
