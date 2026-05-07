import { IsIn, IsOptional } from 'class-validator';

export class UploadQueryDto {
  @IsOptional()
  @IsIn(['image', 'file'])
  mode?: 'image' | 'file';
}
