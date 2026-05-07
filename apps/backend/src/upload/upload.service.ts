import type { UploadResult } from '@repo/types';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MediaFile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly storage: MinioStorageService,
    private readonly prisma: PrismaService
  ) {}

  async uploadImage(file: Express.Multer.File, uploadedBy: string): Promise<UploadResult> {
    this.ensureFile(file);

    const uploaded = await this.storage.upload({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      folder: 'uploads/images'
    });

    const media = await this.createMediaFile(uploadedBy, uploaded);
    return this.toUploadResult(media);
  }

  async uploadFile(file: Express.Multer.File, uploadedBy: string): Promise<UploadResult> {
    this.ensureFile(file);

    const uploaded = await this.storage.upload({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      folder: 'uploads/files'
    });

    const media = await this.createMediaFile(uploadedBy, uploaded);
    return this.toUploadResult(media);
  }

  async deleteByKey(key: string): Promise<void> {
    await this.storage.delete(key);
    await this.prisma.mediaFile.deleteMany({ where: { key } });
  }

  private ensureFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File is required');
    }
  }

  private async createMediaFile(
    uploadedBy: string,
    uploaded: Omit<UploadResult, 'id'>
  ): Promise<MediaFile> {
    return this.prisma.mediaFile.create({
      data: {
        name: uploaded.name,
        originalName: uploaded.name,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        url: uploaded.url,
        key: uploaded.key,
        width: uploaded.width,
        height: uploaded.height,
        uploadedBy,
        tags: []
      }
    });
  }

  private toUploadResult(media: MediaFile): UploadResult {
    return {
      id: media.id,
      url: media.url,
      key: media.key,
      name: media.name,
      size: media.size,
      mimeType: media.mimeType,
      width: media.width ?? undefined,
      height: media.height ?? undefined
    };
  }
}
