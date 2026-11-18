import { useMemo, useState, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  value: (row: T) => string | number | undefined;
  render?: (row: T) => ReactNode;
  width?: string;
}

export default function DataTable<T>({ rows, columns, rowKey, onRowClick, empty = "Nothing to show." }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; empty?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const va = col.value(a), vb = col.value(b);
      if (va === vb) return 0;
      if (va === undefined || va === "") return 1;
      if (vb === undefined || vb === "") return -1;
      return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true })) * sort.dir;
    });
  }, [rows, columns, sort]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}>
                {c.header}{sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? "clickable" : ""}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : (c.value(row) ?? "—")}</td>)}
            </tr>
          ))}
          {sorted.length === 0 && <tr><td colSpan={columns.length} className="muted center">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
