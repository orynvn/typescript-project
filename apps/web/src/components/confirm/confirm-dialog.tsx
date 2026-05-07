'use client';

import type { ConfirmOptions } from '@/providers/confirm-provider';

type Props = {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, options, onConfirm, onCancel }: Props): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{ background: '#fff', borderRadius: 10, width: 'min(92vw, 420px)', padding: 16 }}
        onClick={(event) => event.stopPropagation()}
      >
        <strong>{options.title}</strong>
        {options.description ? <p>{options.description}</p> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel}>
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button type="button" onClick={onConfirm}>
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
