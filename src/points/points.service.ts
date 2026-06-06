import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointBalance: true },
    });

    return { message: 'Berhasil', data: { pointBalance: user?.pointBalance ?? 0 } };
  }

  async getHistory(userId: string) {
    const transactions = await this.prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        submission: {
          select: { wasteType: true, actualWeight: true },
        },
        voucherRedemption: {
          select: {
            voucher: { select: { name: true } },
          },
        },
      },
    });

    return { message: 'Berhasil', data: transactions };
  }
}
