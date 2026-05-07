'use client';

import { useMemo, useState } from 'react';

export type ColumnDef<T> = {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T extends { id: string }> = {
  data: T[];
  columns: ColumnDef<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
};

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
}: DataTableProps<T>): JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return data;
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [data, search]);

  return (
    <section>
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}
              >
                {column.header}
              </th>
            ))}
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1}>No data found</td>
            </tr>
          ) : (
            filtered.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={String(column.key)}>
                    {column.render ? column.render(row) : String(row[column.key])}
                  </td>
                ))}
                <td>
                  <button onClick={() => onEdit?.(row)}>Edit</button>
                  <button onClick={() => onDelete?.(row)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
