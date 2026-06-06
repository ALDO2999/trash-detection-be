import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class VoucherService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async getAll() {
    const vouchers = await this.prisma.voucher.findMany({
      where: { isActive: true },
      orderBy: { pointCost: 'asc' },
    });

    return { data: vouchers };
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

    const redemption = await this.prisma.$transaction(async (tx) => {
      const newRedemption = await tx.voucherRedemption.create({
        data: {
          userId,
          voucherId,
          pointsUsed: voucher.pointCost,
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
    );

    return {
      message: 'Voucher berhasil ditukarkan',
      data: {
        redemptionId: redemption.id,
        voucherName: voucher.name,
        pointsUsed: voucher.pointCost,
        redeemedAt: redemption.redeemedAt,
      },
    };
  }

  async getMyRedemptions(userId: string) {
    const redemptions = await this.prisma.voucherRedemption.findMany({
      where: { userId },
      orderBy: { redeemedAt: 'desc' },
      include: {
        voucher: {
          select: { name: true, value: true, pointCost: true },
        },
      },
    });

    return { data: redemptions };
  }
}
