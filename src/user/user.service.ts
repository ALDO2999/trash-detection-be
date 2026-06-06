import { Injectable, NotFoundException } from '@nestjs/common';
import { SubmissionStatus, WasteType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        pointBalance: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User tidak ditemukan');

    return { data: user };
  }

  async getDashboard(userId: string) {
    const [
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions,
      pointBalance,
      totalPointsEarned,
      wasteByType,
    ] = await Promise.all([
      this.prisma.submission.count({ where: { userId } }),
      this.prisma.submission.count({ where: { userId, status: SubmissionStatus.DISETUJUI } }),
      this.prisma.submission.count({ where: { userId, status: SubmissionStatus.MENUNGGU_VERIFIKASI } }),
      this.prisma.submission.count({ where: { userId, status: SubmissionStatus.DITOLAK } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { pointBalance: true },
      }),
      this.prisma.pointTransaction.aggregate({
        where: { userId, type: 'EARNED' },
        _sum: { amount: true },
      }),
      this.prisma.submission.groupBy({
        by: ['wasteType'],
        where: { userId, status: SubmissionStatus.DISETUJUI },
        _sum: { actualWeight: true },
        _count: { id: true },
      }),
    ]);

    const totalWeightKg = wasteByType.reduce(
      (sum, w) => sum + (w._sum.actualWeight ?? 0),
      0,
    );

    // Susun statistik per jenis sampah dengan default 0
    const wasteStats: Record<string, { totalWeight: number; totalSubmissions: number }> = {};
    for (const type of Object.values(WasteType)) {
      wasteStats[type] = { totalWeight: 0, totalSubmissions: 0 };
    }
    for (const w of wasteByType) {
      wasteStats[w.wasteType] = {
        totalWeight: w._sum.actualWeight ?? 0,
        totalSubmissions: w._count.id,
      };
    }

    return {
      data: {
        pointBalance: pointBalance?.pointBalance ?? 0,
        totalPointsEarned: totalPointsEarned._sum.amount ?? 0,
        totalSubmissions,
        approvedSubmissions,
        pendingSubmissions,
        rejectedSubmissions,
        totalWeightKg: Math.round(totalWeightKg * 100) / 100,
        wasteStats,
      },
    };
  }
}
