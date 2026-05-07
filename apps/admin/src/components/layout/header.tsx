'use client';

import { DynamicBreadcrumb } from '@/components/layout/dynamic-breadcrumb';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAuthStore } from '@/stores/auth.store';

export function Header(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  return (
    <header style={{ borderBottom: '1px solid #ddd', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <DynamicBreadcrumb />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NotificationBell />
          <div>{user ? `${user.name} (${user.role})` : 'Guest'}</div>
        </div>
      </div>
    </header>
  );
}
