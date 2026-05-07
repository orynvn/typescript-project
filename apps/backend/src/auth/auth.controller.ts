import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TwoFactorValidateDto } from './dto/two-factor-validate.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(
    @Body() dto: LoginDto,
  ): Promise<
    | { accessToken: string; refreshToken: string }
    | { requiresTwoFactor: true; tempToken: string; method: 'EMAIL' | 'TOTP' }
  > {
    return this.authService.login(dto);
  }

  @Public()
  @Post('2fa/validate')
  validateTwoFactor(
    @Body() dto: TwoFactorValidateDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.validateTwoFactor(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @Req() req: { user: { userId: string } },
  ): Promise<{ id: string; email: string; name: string; role: string }> {
    return this.authService.me(req.user.userId);
  }
}
