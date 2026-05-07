'use client';

import { usePathname } from 'next/navigation';

const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  notifications: 'Notifications',
  monitoring: 'Monitoring',
  settings: 'Settings',
};

export function DynamicBreadcrumb(): JSX.Element {
  const pathname = usePathname();

  const crumbs = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (labelMap[segment]) {
        return labelMap[segment];
      }
      if (/^[a-z0-9]{8,}$/i.test(segment)) {
        return `#${segment.slice(0, 8)}`;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    });

  return <div>{crumbs.join(' > ') || 'Dashboard'}</div>;
}
