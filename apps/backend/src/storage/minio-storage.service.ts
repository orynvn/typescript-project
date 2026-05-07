import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { IStorageProvider, StorageUploadInput } from './storage.interface';

@Injectable()
export class MinioStorageService implements IStorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async upload(input: StorageUploadInput): Promise<{
    key: string;
    url: string;
    name: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  }> {
    const key = `${input.folder}/${new Date().getFullYear()}/${randomUUID()}-${input.fileName}`;
    const baseUrl = this.configService.get<string>('MINIO_PUBLIC_URL', 'http://localhost:9000');

    return {
      key,
      url: `${baseUrl}/${this.configService.get<string>('MINIO_BUCKET', 'uploads')}/${key}`,
      name: input.fileName,
      size: input.fileBuffer.byteLength,
      mimeType: input.mimeType
    };
  }

  async delete(_key: string): Promise<void> {
    // Placeholder: MinIO SDK removeObject will be wired in runtime integration task.
  }
}
