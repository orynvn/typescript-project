'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function Header(): JSX.Element {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const breadcrumbs = pathname
    .split('/')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

  return (
    <header style={{ borderBottom: '1px solid #ddd', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>{breadcrumbs.join(' > ') || 'Dashboard'}</div>
        <div>{user ? `${user.name} (${user.role})` : 'Guest'}</div>
      </div>
    </header>
  );
}
