import { Controller, Get } from '@nestjs/common';
import type { AppHealth } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageService,
  ) {}

  @Get()
  async getHealth(): Promise<AppHealth> {
    const dbStart = Date.now();
    let dbStatus: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'down';
    }

    let storageStatus: 'up' | 'down' = 'up';
    try {
      await this.storage.healthCheck();
    } catch {
      storageStatus = 'down';
    }

    return {
      status: dbStatus === 'up' && storageStatus === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: dbStatus, latencyMs: Date.now() - dbStart },
        storage: { status: storageStatus },
      },
    };
  }
}
