import { IsString, Length } from 'class-validator';

export class EnableEmailTwoFactorDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
