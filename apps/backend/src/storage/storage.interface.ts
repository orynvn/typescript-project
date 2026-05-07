import type { UploadResult } from '@repo/types';

export type StorageUploadInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  folder: string;
};

export interface IStorageProvider {
  upload(input: StorageUploadInput): Promise<Omit<UploadResult, 'id'>>;
  delete(key: string): Promise<void>;
}
