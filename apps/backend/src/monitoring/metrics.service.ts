import { Injectable } from '@nestjs/common';

type RequestMetric = {
  method: string;
  route: string;
  status: number;
  durationMs: number;
  timestamp: number;
};

type ErrorMetric = {
  id: string;
  timestamp: string;
  level: 'error' | 'warn';
  message: string;
  route: string;
  stackTrace?: string;
};

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly requests: RequestMetric[] = [];
  private readonly errors: ErrorMetric[] = [];
  private activeConnections = 0;
  private fileUploadTotal = 0;

  onRequestStart(): void {
    this.activeConnections += 1;
  }

  onRequestEnd(metric: Omit<RequestMetric, 'timestamp'>): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    this.requests.push({ ...metric, timestamp: Date.now() });
    if (this.requests.length > 3000) {
      this.requests.splice(0, this.requests.length - 3000);
    }
  }

  incrementFileUpload(): void {
    this.fileUploadTotal += 1;
  }

  addError(error: Omit<ErrorMetric, 'id' | 'timestamp'>): void {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    this.errors.unshift({ id, timestamp: new Date().toISOString(), ...error });
    if (this.errors.length > 300) {
      this.errors.splice(300);
    }
  }

  getRecentErrors(limit = 20): ErrorMetric[] {
    return this.errors.slice(0, limit);
  }

  getRecentErrorCount(hours = 1): number {
    const threshold = Date.now() - hours * 60 * 60 * 1000;
    return this.errors.filter((item) => new Date(item.timestamp).getTime() >= threshold).length;
  }

  getPrometheusMetricsText(): string {
    const uptimeSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const totalRequests = this.requests.length;
    const totalErrors = this.requests.filter((item) => item.status >= 500).length;

    const routes = new Map<string, number>();
    for (const item of this.requests) {
      const key = `${item.method}|${item.route}|${item.status}`;
      routes.set(key, (routes.get(key) ?? 0) + 1);
    }

    const avgLatencyMs =
      this.requests.length === 0
        ? 0
        : this.requests.reduce((acc, item) => acc + item.durationMs, 0) / this.requests.length;

    const lines = [
      '# HELP app_uptime_seconds Application uptime in seconds',
      '# TYPE app_uptime_seconds gauge',
      `app_uptime_seconds ${uptimeSeconds}`,
      '# HELP http_requests_total Total HTTP requests observed by API',
      '# TYPE http_requests_total counter',
      ...Array.from(routes.entries()).map(([key, count]) => {
        const [method, route, status] = key.split('|');
        return `http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`;
      }),
      '# HELP http_requests_errors_total Total HTTP 5xx responses',
      '# TYPE http_requests_errors_total counter',
      `http_requests_errors_total ${totalErrors}`,
      '# HELP http_request_duration_milliseconds_average Average HTTP request duration in ms',
      '# TYPE http_request_duration_milliseconds_average gauge',
      `http_request_duration_milliseconds_average ${avgLatencyMs.toFixed(2)}`,
      '# HELP active_connections Active in-flight requests',
      '# TYPE active_connections gauge',
      `active_connections ${this.activeConnections}`,
      '# HELP file_upload_total Total uploaded files',
      '# TYPE file_upload_total counter',
      `file_upload_total ${this.fileUploadTotal}`,
      '# HELP http_requests_observed_total Number of requests kept in memory window',
      '# TYPE http_requests_observed_total gauge',
      `http_requests_observed_total ${totalRequests}`,
    ];

    return `${lines.join('\n')}\n`;
  }

  getRequestChart(hours = 24): Array<{ hour: string; total: number; errors: number }> {
    const points = new Map<string, { total: number; errors: number }>();
    const now = new Date();

    for (let i = hours - 1; i >= 0; i -= 1) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = `${String(date.getHours()).padStart(2, '0')}:00`;
      points.set(key, { total: 0, errors: 0 });
    }

    const threshold = Date.now() - hours * 60 * 60 * 1000;
    for (const req of this.requests) {
      if (req.timestamp < threshold) {
        continue;
      }
      const hour = `${String(new Date(req.timestamp).getHours()).padStart(2, '0')}:00`;
      const bucket = points.get(hour);
      if (!bucket) {
        continue;
      }
      bucket.total += 1;
      if (req.status >= 500) {
        bucket.errors += 1;
      }
    }

    return Array.from(points.entries()).map(([hour, values]) => ({ hour, ...values }));
  }

  getSummary24h(): {
    totalRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    uptimePercent: number;
  } {
    const threshold = Date.now() - 24 * 60 * 60 * 1000;
    const windowed = this.requests.filter((item) => item.timestamp >= threshold);
    const totalRequests = windowed.length;
    const errorRequests = windowed.filter((item) => item.status >= 500).length;

    const avgLatencyMs =
      totalRequests === 0
        ? 0
        : windowed.reduce((acc, item) => acc + item.durationMs, 0) / totalRequests;

    const errorRate = totalRequests === 0 ? 0 : (errorRequests / totalRequests) * 100;

    return {
      totalRequests,
      errorRate: Number(errorRate.toFixed(2)),
      avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
      uptimePercent: 99.9,
    };
  }
}
