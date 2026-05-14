import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  key: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({ columns, data, keyField, isLoading, emptyMessage = "No records found", onRowClick }: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm" data-testid="data-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map(col => (
                <th key={col.key} className={cn("text-left px-4 py-3 font-medium text-muted-foreground", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={String(row[keyField])}
                  className={cn("border-b border-border last:border-0 hover:bg-muted/30 transition-colors", onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row)}
                  data-testid={`table-row-${String(row[keyField])}`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn("px-4 py-3 text-foreground", col.className)}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
