import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [MonitoringController],
  providers: [MetricsService, MonitoringService],
  exports: [MetricsService],
})
export class MonitoringModule {}
