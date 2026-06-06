import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      if (existing.isVerified) {
        throw new ConflictException('Email sudah terdaftar');
      }
      // Akun ada tapi belum diverifikasi — kirim ulang OTP
      await this.sendOtp(existing.id, existing.email, existing.name);
      return { message: 'Akun sudah ada, OTP baru telah dikirim ke email Anda' };
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
      },
    });

    await this.sendOtp(user.id, user.email, user.name);

    return { message: 'Registrasi berhasil, cek email Anda untuk kode OTP' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (user.isVerified) throw new BadRequestException('Akun sudah terverifikasi');

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email: dto.email,
        otp: dto.otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP tidak valid atau sudah kedaluwarsa');
    }

    await this.prisma.$transaction([
      this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    return { message: 'Akun berhasil diverifikasi, silakan login' };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (user.isVerified) throw new BadRequestException('Akun sudah terverifikasi');

    // Rate limit: cek apakah ada OTP yang dibuat dalam 1 menit terakhir
    const recentOtp = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        isUsed: false,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentOtp) {
      throw new BadRequestException('Tunggu 1 menit sebelum meminta OTP baru');
    }

    await this.sendOtp(user.id, user.email, user.name);
    return { message: 'OTP baru telah dikirim ke email Anda' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Akun belum diverifikasi, cek email Anda');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      message: 'Login berhasil',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          pointBalance: user.pointBalance,
        },
        ...tokens,
      },
    };
  }

  async refreshToken(token: string) {
    const record = await this.prisma.refreshToken.findUnique({ where: { token } });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token tidak valid atau sudah kedaluwarsa');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      await this.prisma.refreshToken.delete({ where: { id: record.id } });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return { message: 'Berhasil', data: tokens };
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid');
    }
  }

  async logout(userId: string, token: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token },
    });
    return { message: 'Logout berhasil' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Don't reveal whether email exists for unverified accounts
    if (!user || !user.isVerified) {
      return { message: 'Jika email terdaftar dan terverifikasi, kode OTP akan dikirim' };
    }

    const recentOtp = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        isUsed: false,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentOtp) {
      throw new BadRequestException('Tunggu 1 menit sebelum meminta OTP baru');
    }

    await this.sendPasswordResetOtp(user.id, user.email, user.name);
    return { message: 'Kode OTP reset password telah dikirim ke email Anda' };
  }

  async resetPassword(dto: { email: string; otp: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email: dto.email,
        otp: dto.otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP tidak valid atau sudah kedaluwarsa');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
    ]);

    return { message: 'Password berhasil direset, silakan login' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as any,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private async sendPasswordResetOtp(userId: string, email: string, name: string) {
    const otp = this.generateOtp();
    const expiresMinutes = this.config.get<number>('OTP_EXPIRES_MINUTES') ?? 5;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: { email, otp, expiresAt, userId },
    });

    await this.emailService.sendPasswordResetOtp(email, name, otp);
  }

  private async sendOtp(userId: string, email: string, name: string) {
    const otp = this.generateOtp();
    const expiresMinutes = this.config.get<number>('OTP_EXPIRES_MINUTES') ?? 5;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: { email, otp, expiresAt, userId },
    });

    await this.emailService.sendOtp(email, name, otp);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
