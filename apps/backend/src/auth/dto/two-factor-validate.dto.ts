import { IsString, Length } from 'class-validator';

export class TwoFactorValidateDto {
  @IsString()
  tempToken!: string;

  @IsString()
  @Length(6, 32)
  code!: string;
}
