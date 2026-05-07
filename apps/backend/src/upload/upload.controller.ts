import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { UploadResult } from '@repo/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { userId: string } }
  ): Promise<UploadResult> {
    return this.uploadService.uploadImage(file, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload/file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { userId: string } }
  ): Promise<UploadResult> {
    return this.uploadService.uploadFile(file, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('upload/:key')
  async deleteFile(@Param('key') key: string): Promise<{ deleted: boolean }> {
    await this.uploadService.deleteByKey(key);
    return { deleted: true };
  }

  @Get('media/status')
  getMediaStatus(): { installed: boolean } {
    return { installed: false };
  }
}
