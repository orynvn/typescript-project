'use client';

import { createContext, useCallback, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm/confirm-dialog';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
};

type ConfirmState = {
  open: boolean;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(
  async () => false,
);

export function ConfirmProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <ConfirmDialog
          open={state.open}
          options={state.options}
          onConfirm={() => {
            state.resolve(true);
            setState(null);
          }}
          onCancel={() => {
            state.resolve(false);
            setState(null);
          }}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}
