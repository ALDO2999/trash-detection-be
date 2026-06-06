import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubmissionStatus, WasteType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

    return { message: 'Berhasil', data: user };
  }

  async getDashboard(userId: string) {
    const [
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions,
      userBalances,
      wasteByType,
    ] = await Promise.all([
      this.prisma.submission.count({ where: { userId } }),
      this.prisma.submission.count({ where: { userId, status: SubmissionStatus.DISETUJUI } }),
      this.prisma.submission.count({ where: { userId, status: SubmissionStatus.MENUNGGU_VERIFIKASI } }),
      this.prisma.submission.count({ where: { userId, status: SubmissionStatus.DITOLAK } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { pointBalance: true, totalPointsEarned: true },
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
      message: 'Berhasil',
      data: {
        pointBalance: userBalances?.pointBalance ?? 0,
        totalPointsEarned: userBalances?.totalPointsEarned ?? 0,
        totalSubmissions,
        approvedSubmissions,
        pendingSubmissions,
        rejectedSubmissions,
        totalWeightKg: Math.round(totalWeightKg * 100) / 100,
        wasteStats,
      },
    };
  }

  async getLeaderboard(userId: string) {
    const top = await this.prisma.user.findMany({
      where: { role: 'USER', isVerified: true },
      orderBy: [{ totalPointsEarned: 'desc' }, { createdAt: 'asc' }],
      take: 10,
      select: { id: true, name: true, totalPointsEarned: true },
    });

    const entries = top.map((u, i) => ({
      id: u.id,
      rank: i + 1,
      name: u.name,
      points: u.totalPointsEarned,
      isCurrentUser: u.id === userId,
    }));

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, totalPointsEarned: true, createdAt: true },
    });

    let currentUser: {
      id: string;
      rank: number;
      name: string;
      points: number;
    } | null = null;

    if (me) {
      // Hitung berapa user yang berada di atas:
      // - poin lebih banyak, ATAU
      // - poin sama tapi daftar lebih awal (createdAt lebih kecil)
      const higherCount = await this.prisma.user.count({
        where: {
          role: 'USER',
          isVerified: true,
          OR: [
            { totalPointsEarned: { gt: me.totalPointsEarned } },
            { totalPointsEarned: me.totalPointsEarned, createdAt: { lt: me.createdAt } },
          ],
        },
      });
      currentUser = {
        id: me.id,
        rank: higherCount + 1,
        name: me.name,
        points: me.totalPointsEarned,
      };
    }

    return { message: 'Berhasil', data: { entries, currentUser } };
  }

  async updateProfile(userId: string, dto: { name?: string; phone?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name?.trim() && { name: dto.name.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, pointBalance: true },
    });
    return { message: 'Profil berhasil diperbarui', data: user };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Password saat ini tidak sesuai');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return { message: 'Password berhasil diubah' };
  }

  async deleteAccount(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.pointTransaction.deleteMany({ where: { userId } });
      await tx.voucherRedemption.deleteMany({ where: { userId } });
      await tx.submission.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    return { message: 'Akun berhasil dihapus' };
  }
}
