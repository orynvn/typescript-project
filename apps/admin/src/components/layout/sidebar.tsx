'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { navItems } from '@/config/nav-items.config';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const canViewMonitoring = user?.role === 'SUPER_ADMIN';
  const { data: errorCount = 0 } = useQuery({
    queryKey: ['monitoring-error-count'],
    queryFn: async () => {
      const response = await api.get('/admin/monitoring/error-count');
      return Number(response.data?.data?.count ?? response.data?.count ?? 0);
    },
    enabled: canViewMonitoring,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <aside style={{ width: 260, borderRight: '1px solid #ddd', padding: 16 }}>
      <h2>Admin</h2>
      <nav style={{ display: 'grid', gap: 8 }}>
        {navItems
          .filter((item) => !item.roles || (user?.role ? item.roles.includes(user.role) : false))
          .map((item) => {
            if (item.href) {
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  style={{ fontWeight: pathname === item.href ? 700 : 400 }}
                >
                  {item.title}
                  {item.href === '/monitoring' && errorCount > 0 ? (
                    <span
                      style={{
                        display: 'inline-block',
                        marginLeft: 8,
                        padding: '2px 6px',
                        borderRadius: 999,
                        fontSize: 12,
                        color: '#fff',
                        background: '#dc2626',
                      }}
                    >
                      {errorCount}
                    </span>
                  ) : null}
                </Link>
              );
            }

            return (
              <div key={item.title}>
                <strong>{item.title}</strong>
                <div style={{ display: 'grid', marginLeft: 12 }}>
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      style={{ fontWeight: pathname === child.href ? 700 : 400 }}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
      </nav>
    </aside>
  );
}
