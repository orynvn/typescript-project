'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type MonitoringOverview = {
  services: {
    backend: { status: 'healthy' | 'degraded' | 'down'; latencyMs: number };
    database: { status: 'healthy' | 'degraded' | 'down'; latencyMs: number };
    storage: { status: 'healthy' | 'degraded' | 'down' };
  };
  metrics24h: {
    totalRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    uptimePercent: number;
  };
  requestChart: Array<{ hour: string; total: number; errors: number }>;
  recentErrors: Array<{
    id: string;
    timestamp: string;
    level: 'error' | 'warn';
    message: string;
    route: string;
    stackTrace?: string;
  }>;
  queues: {
    email: { pending: number; failed: number; completed: number };
  };
};

export default function MonitoringPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const isAuthorized = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isAuthorized) {
      router.replace('/403');
    }
  }, [isAuthorized, router]);

  const { data, isFetching } = useQuery({
    queryKey: ['monitoring-overview'],
    queryFn: async () => {
      const response = await api.get('/admin/monitoring/overview');
      return (response.data?.data ?? response.data) as MonitoringOverview;
    },
    enabled: isAuthorized,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const lastUpdated = useMemo(() => new Date().toLocaleTimeString(), [data]);

  if (!isAuthorized) {
    return <section>Redirecting...</section>;
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <header>
        <h1>Monitoring</h1>
        <p>
          Last updated: {lastUpdated} {isFetching ? '• refreshing...' : ''}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {Object.entries(data?.services ?? {}).map(([name, service]) => (
          <article key={name} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, textTransform: 'capitalize' }}>{name}</p>
            <strong>{service.status}</strong>
            {'latencyMs' in service ? <p>{service.latencyMs} ms</p> : null}
          </article>
        ))}
      </div>

      <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Key Metrics (24h)</h2>
        <p>Total requests: {data?.metrics24h.totalRequests ?? 0}</p>
        <p>Error rate: {data?.metrics24h.errorRate ?? 0}%</p>
        <p>Avg latency: {data?.metrics24h.avgLatencyMs ?? 0} ms</p>
        <p>Uptime: {data?.metrics24h.uptimePercent ?? 0}%</p>
      </article>

      <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Recent Errors</h2>
        {data?.recentErrors.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Time</th>
                <th align="left">Level</th>
                <th align="left">Message</th>
                <th align="left">Route</th>
              </tr>
            </thead>
            <tbody>
              {data.recentErrors.slice(0, 10).map((error) => (
                <tr key={error.id}>
                  <td>{new Date(error.timestamp).toLocaleString()}</td>
                  <td>{error.level}</td>
                  <td>{error.message}</td>
                  <td>{error.route}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No recent errors.</p>
        )}
      </article>

      <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Email Queue</h2>
        <p>Pending: {data?.queues.email.pending ?? 0}</p>
        <p>Failed: {data?.queues.email.failed ?? 0}</p>
        <p>Completed: {data?.queues.email.completed ?? 0}</p>
      </article>
    </section>
  );
}
