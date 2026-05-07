import { Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [StorageModule, PrismaModule, MonitoringModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
