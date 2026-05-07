'use client';

import { useContext } from 'react';
import { ConfirmContext, type ConfirmOptions } from '@/providers/confirm-provider';

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
