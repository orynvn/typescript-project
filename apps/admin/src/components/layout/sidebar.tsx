'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/config/nav-items.config';

export function Sidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside style={{ width: 260, borderRight: '1px solid #ddd', padding: 16 }}>
      <h2>Admin</h2>
      <nav style={{ display: 'grid', gap: 8 }}>
        {navItems.map((item) => {
          if (item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                style={{ fontWeight: pathname === item.href ? 700 : 400 }}
              >
                {item.title}
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
