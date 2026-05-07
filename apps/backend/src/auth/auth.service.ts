import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { LoginDto } from './dto/login.dto';
import { TwoFactorValidateDto } from './dto/two-factor-validate.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<
    | { accessToken: string; refreshToken: string }
    | { requiresTwoFactor: true; tempToken: string; method: 'EMAIL' | 'TOTP' }
  > {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      const challenge = await this.twoFactorService.createLoginChallenge(user.id);
      return {
        requiresTwoFactor: true,
        tempToken: challenge.tempToken,
        method: challenge.method,
      };
    }

    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  async validateTwoFactor(
    dto: TwoFactorValidateDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const challenge = await this.twoFactorService.validateLoginChallenge(dto.tempToken, dto.code);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: challenge.userId } });
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  async me(userId: string): Promise<{ id: string; email: string; name: string; role: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
