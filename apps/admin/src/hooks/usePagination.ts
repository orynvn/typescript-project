import { useMemo } from 'react';

export function usePagination(total: number, page: number, limit: number): { totalPages: number } {
  return useMemo(
    () => ({ totalPages: Math.max(Math.ceil(total / limit), 1) }),
    [limit, page, total],
  );
}
