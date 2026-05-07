import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DisableTwoFactorDto } from './dto/disable-2fa.dto';
import { EnableEmailTwoFactorDto } from './dto/enable-email-2fa.dto';
import { TwoFactorService } from './two-factor.service';

type AuthReq = { user: { userId: string } };

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @UseGuards(JwtAuthGuard)
  @Post('email/send')
  sendEmailOtp(@Req() req: AuthReq) {
    return this.twoFactorService.sendEmailOtpForSetup(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/verify')
  verifyEmailOtp(@Req() req: AuthReq, @Body() dto: EnableEmailTwoFactorDto) {
    return this.twoFactorService.enableEmail2fa(req.user.userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable')
  disable(@Req() req: AuthReq, @Body() dto: DisableTwoFactorDto) {
    return this.twoFactorService.disable2fa(req.user.userId, dto.code);
  }
}
