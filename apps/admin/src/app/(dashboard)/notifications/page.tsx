'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';

type NotificationItem = {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  body: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=20&page=1');
      return response.data?.data ?? response.data;
    },
  });

  const notifications: NotificationItem[] = useMemo(() => data?.items ?? [], [data]);

  async function markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] }),
    ]);
  }

  async function markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] }),
    ]);
  }

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Notifications</h1>
        <button type="button" onClick={() => void markAllRead()} disabled={isFetching}>
          Mark all as read
        </button>
      </header>

      <div style={{ display: 'grid', gap: 8 }}>
        {notifications.map((item) => (
          <article key={item.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{item.title}</strong>
                <p style={{ margin: '6px 0' }}>{item.body}</p>
                <small>
                  {item.type} • {new Date(item.createdAt).toLocaleString()}
                </small>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {!item.isRead ? (
                  <button type="button" onClick={() => void markRead(item.id)}>
                    Mark read
                  </button>
                ) : null}
                {item.actionUrl ? <Link href={item.actionUrl}>Open</Link> : null}
              </div>
            </div>
          </article>
        ))}
        {notifications.length === 0 ? <p>No notifications yet.</p> : null}
      </div>
    </section>
  );
}
