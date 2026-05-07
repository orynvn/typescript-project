import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendWelcome(to: string, name: string): Promise<void> {
    this.logger.log(`Queue welcome email to ${to} (${name})`);
  }

  async sendVerifyEmail(to: string, name: string, token: string): Promise<void> {
    this.logger.log(`Queue verify email to ${to} (${name}) token=${token}`);
  }

  async sendResetPassword(to: string, name: string, token: string): Promise<void> {
    this.logger.log(`Queue reset password email to ${to} (${name}) token=${token}`);
  }

  async sendTwoFactorOtp(to: string, name: string, code: string): Promise<void> {
    this.logger.log(`Queue 2FA OTP email to ${to} (${name}) code=${code}`);
  }
}
