'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type Props<T> = {
  placeholder?: string;
  queryKey: string;
  queryFn: (search: string) => Promise<T[]>;
  getOptionLabel: (item: T) => string;
  getOptionValue: (item: T) => string;
  onChange: (value: T | null) => void;
};

export function AsyncCombobox<T>({
  placeholder = 'Search...',
  queryKey,
  queryFn,
  getOptionLabel,
  getOptionValue,
  onChange,
}: Props<T>): JSX.Element {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, search],
    queryFn: () => queryFn(search),
    staleTime: 60_000,
  });

  const options = useMemo(() => data ?? [], [data]);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <input
        value={search}
        placeholder={placeholder}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div style={{ border: '1px solid #ddd', borderRadius: 8, maxHeight: 220, overflow: 'auto' }}>
        {isLoading ? <p style={{ padding: 8 }}>Loading...</p> : null}
        {!isLoading && options.length === 0 ? <p style={{ padding: 8 }}>No results.</p> : null}
        {options.map((item) => (
          <button
            key={getOptionValue(item)}
            type="button"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: 8,
              border: 'none',
              background: '#fff',
            }}
            onClick={() => onChange(item)}
          >
            {getOptionLabel(item)}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onChange(null)}>
        Clear
      </button>
    </div>
  );
}
