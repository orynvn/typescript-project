import { LayoutDashboard, Settings, Users } from 'lucide-react';
import type { UserRole } from '@/types';

export type NavItem = {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ size?: number }>;
  roles?: UserRole[];
  children?: Array<{ title: string; href: string }>;
};

export const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'User Management',
    icon: Users,
    children: [{ title: 'All Users', href: '/users' }],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN'],
  },
];
