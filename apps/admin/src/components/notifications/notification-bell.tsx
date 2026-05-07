'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';

export function NotificationBell(): JSX.Element {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return Number(response.data?.data?.count ?? response.data?.count ?? 0);
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  return (
    <Link href="/notifications" style={{ position: 'relative', display: 'inline-flex' }}>
      <Bell size={18} />
      {unreadCount > 0 ? (
        <span
          style={{
            position: 'absolute',
            top: -8,
            right: -10,
            background: '#dc2626',
            color: '#fff',
            borderRadius: '999px',
            minWidth: 18,
            height: 18,
            fontSize: 11,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
