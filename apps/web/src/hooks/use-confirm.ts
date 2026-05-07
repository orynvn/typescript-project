'use client';

import { useContext } from 'react';
import { ConfirmContext, type ConfirmOptions } from '@/providers/confirm-provider';

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  return useContext(ConfirmContext);
}
