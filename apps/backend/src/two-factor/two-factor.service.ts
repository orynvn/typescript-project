import { randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TwoFactorMethod } from '@prisma/client';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async sendEmailOtpForSetup(userId: string): Promise<{ sent: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const code = this.generateOtp();
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.twoFactorChallenge.create({
      data: {
        userId,
        method: TwoFactorMethod.EMAIL,
        tempToken: `setup-${randomBytes(12).toString('hex')}`,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await this.mailService.sendTwoFactorOtp(user.email, user.name, code);
    return { sent: true };
  }

  async enableEmail2fa(
    userId: string,
    code: string,
  ): Promise<{ enabled: true; backupCodes: string[] }> {
    const challenge = await this.prisma.twoFactorChallenge.findFirst({
      where: {
        userId,
        method: TwoFactorMethod.EMAIL,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    const isValid = await bcrypt.compare(code, challenge.codeHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(backupCodes.map((item) => bcrypt.hash(item, 10)));

    await this.prisma.$transaction([
      this.prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: TwoFactorMethod.EMAIL,
          backupCodes: hashedBackupCodes,
        },
      }),
    ]);

    return { enabled: true, backupCodes };
  }

  async disable2fa(userId: string, code: string): Promise<{ disabled: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const matched = await this.matchBackupCode(code, user.backupCodes);
    if (!matched) {
      throw new UnauthorizedException('Invalid backup code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    return { disabled: true };
  }

  async createLoginChallenge(
    userId: string,
  ): Promise<{ tempToken: string; method: TwoFactorMethod }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const method = user.twoFactorMethod ?? TwoFactorMethod.EMAIL;
    const code = this.generateOtp();
    const codeHash = await bcrypt.hash(code, 10);

    const tempToken = await this.jwtService.signAsync(
      { sub: userId, purpose: '2fa_login' },
      { expiresIn: '5m' },
    );

    await this.prisma.twoFactorChallenge.create({
      data: {
        userId,
        method,
        tempToken,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    if (method === TwoFactorMethod.EMAIL) {
      await this.mailService.sendTwoFactorOtp(user.email, user.name, code);
    }

    return { tempToken, method };
  }

  async validateLoginChallenge(tempToken: string, code: string): Promise<{ userId: string }> {
    const challenge = await this.prisma.twoFactorChallenge.findFirst({
      where: {
        tempToken,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!challenge) {
      throw new UnauthorizedException('Two-factor challenge expired');
    }

    if (challenge.attempts >= 5) {
      throw new UnauthorizedException('Too many attempts. Try again later');
    }

    const directMatch = await bcrypt.compare(code, challenge.codeHash);
    const backupMatch = await this.matchBackupCode(code, challenge.user.backupCodes);
    if (!directMatch && !backupMatch) {
      await this.prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: { attempts: challenge.attempts + 1 },
      });
      throw new UnauthorizedException('Invalid two-factor code');
    }

    const updatedBackupCodes = backupMatch
      ? await this.consumeBackupCode(code, challenge.user.backupCodes)
      : challenge.user.backupCodes;

    await this.prisma.$transaction([
      this.prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: challenge.userId },
        data: { backupCodes: updatedBackupCodes },
      }),
    ]);

    return { userId: challenge.userId };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateBackupCodes(): string[] {
    return Array.from(
      { length: 8 },
      () =>
        `${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
    );
  }

  private async matchBackupCode(code: string, hashes: string[]): Promise<boolean> {
    for (const hash of hashes) {
      if (await bcrypt.compare(code, hash)) {
        return true;
      }
    }
    return false;
  }

  private async consumeBackupCode(code: string, hashes: string[]): Promise<string[]> {
    const result: string[] = [];
    let consumed = false;

    for (const hash of hashes) {
      if (!consumed && (await bcrypt.compare(code, hash))) {
        consumed = true;
        continue;
      }
      result.push(hash);
    }

    return result;
  }
}
