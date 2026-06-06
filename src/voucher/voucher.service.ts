import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const VOUCHER_VALIDITY_DAYS = 14;

@Injectable()
export class VoucherService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // Kode voucher: ECO-XXXXX-XXXXX (tanpa karakter ambigu seperti 0/O, 1/I)
  private generateVoucherCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(10);
    let s = '';
    for (let i = 0; i < 10; i++) s += alphabet[bytes[i] % alphabet.length];
    return `ECO-${s.slice(0, 5)}-${s.slice(5)}`;
  }

  async getAll() {
    const vouchers = await this.prisma.voucher.findMany({
      where: { isActive: true },
      orderBy: { pointCost: 'asc' },
    });

    return { message: 'Berhasil', data: vouchers };
  }

  async redeem(userId: string, voucherId: string) {
    const [user, voucher] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.voucher.findUnique({ where: { id: voucherId } }),
    ]);

    if (!voucher) throw new NotFoundException('Voucher tidak ditemukan');
    if (!voucher.isActive) throw new BadRequestException('Voucher tidak aktif');
    if (voucher.stock <= 0) throw new BadRequestException('Stok voucher habis');
    if (!user || user.pointBalance < voucher.pointCost) {
      throw new BadRequestException(
        `Poin tidak cukup. Dibutuhkan ${voucher.pointCost} poin, saldo Anda ${user?.pointBalance ?? 0} poin`,
      );
    }

    const code = this.generateVoucherCode();
    const expiresAt = new Date(
      Date.now() + VOUCHER_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
    );

    const redemption = await this.prisma.$transaction(async (tx) => {
      const newRedemption = await tx.voucherRedemption.create({
        data: {
          userId,
          voucherId,
          pointsUsed: voucher.pointCost,
          code,
          expiresAt,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { pointBalance: { decrement: voucher.pointCost } },
      });

      await tx.voucher.update({
        where: { id: voucherId },
        data: { stock: { decrement: 1 } },
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          voucherRedemptionId: newRedemption.id,
          amount: voucher.pointCost,
          type: 'REDEEMED',
          description: `Penukaran voucher: ${voucher.name}`,
        },
      });

      return newRedemption;
    });

    await this.email.sendVoucherRedeemed(
      user.email,
      user.name,
      voucher.name,
      voucher.pointCost,
      redemption.code,
      redemption.expiresAt,
    );

    return {
      message: 'Voucher berhasil ditukarkan',
      data: {
        redemptionId: redemption.id,
        voucherName: voucher.name,
        pointsUsed: voucher.pointCost,
        redeemedAt: redemption.redeemedAt,
        code: redemption.code,
        expiresAt: redemption.expiresAt,
      },
    };
  }

  async getMyRedemptions(userId: string) {
    const redemptions = await this.prisma.voucherRedemption.findMany({
      where: { userId },
      orderBy: { redeemedAt: 'desc' },
      select: {
        id: true,
        code: true,
        pointsUsed: true,
        redeemedAt: true,
        expiresAt: true,
        voucher: {
          select: { name: true, value: true, pointCost: true, description: true },
        },
      },
    });

    return { message: 'Berhasil', data: redemptions };
  }
}
