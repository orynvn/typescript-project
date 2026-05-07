import { IsObject } from 'class-validator';

export class UpdateSeoSettingsDto {
  @IsObject()
  updates!: Record<string, string>;
}
