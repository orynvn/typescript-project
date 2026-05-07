'use client';

import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import type { ConfirmOptions } from '@/providers/confirm-provider';

type Props = {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
};

const variantStyles = {
  danger: { color: '#b91c1c', buttonBg: '#dc2626', Icon: Trash2 },
  warning: { color: '#92400e', buttonBg: '#d97706', Icon: AlertTriangle },
  info: { color: '#1d4ed8', buttonBg: '#2563eb', Icon: Info },
} as const;

export function ConfirmDialog({ open, options, onConfirm, onCancel }: Props): JSX.Element | null {
  if (!open) {
    return null;
  }

  const variant = options.variant ?? 'info';
  const style = variantStyles[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, width: 'min(92vw, 460px)', padding: 20 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
            color: style.color,
          }}
        >
          <style.Icon size={18} />
          <strong>{options.title}</strong>
        </div>
        {options.description ? (
          <p style={{ margin: '8px 0 18px', color: '#374151' }}>{options.description}</p>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel}>
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: style.buttonBg,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
            }}
          >
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
