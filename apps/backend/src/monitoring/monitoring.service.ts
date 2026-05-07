import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageService,
    private readonly metrics: MetricsService,
  ) {}

  async getOverview(): Promise<{
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
    queues: { email: { pending: number; failed: number; completed: number } };
  }> {
    const backendLatencyMs = 5;

    const dbStartedAt = Date.now();
    let databaseStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStartedAt;
      if (dbLatency > 500) {
        databaseStatus = 'degraded';
      }
    } catch {
      databaseStatus = 'down';
    }

    let storageStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    try {
      await this.storage.healthCheck();
    } catch {
      storageStatus = 'down';
    }

    const summary = this.metrics.getSummary24h();

    return {
      services: {
        backend: {
          status: 'healthy',
          latencyMs: backendLatencyMs,
        },
        database: {
          status: databaseStatus,
          latencyMs: Date.now() - dbStartedAt,
        },
        storage: {
          status: storageStatus,
        },
      },
      metrics24h: summary,
      requestChart: this.metrics.getRequestChart(24),
      recentErrors: this.metrics.getRecentErrors(20),
      queues: {
        email: {
          pending: 0,
          failed: 0,
          completed: 0,
        },
      },
    };
  }

  getErrorCount(): { count: number } {
    return {
      count: this.metrics.getRecentErrorCount(1),
    };
  }
}
