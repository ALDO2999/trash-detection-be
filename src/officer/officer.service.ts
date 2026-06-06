import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { POINTS_PER_KG } from '../common/constants/points.constant';
import { VerifyAction, VerifySubmissionDto } from './dto/verify-submission.dto';

@Injectable()
export class OfficerService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async getSubmissions(status?: SubmissionStatus) {
    const submissions = await this.prisma.submission.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        scanResult: { select: { predictedType: true, confidence: true } },
      },
    });

    return { message: 'Berhasil', data: submissions };
  }

  async getSubmissionDetail(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        scanResult: {
          select: { predictedType: true, confidence: true, imageUrl: true },
        },
      },
    });

    if (!submission) throw new NotFoundException('Pengajuan tidak ditemukan');

    return { message: 'Berhasil', data: submission };
  }

  async verifySubmission(
    officerId: string,
    submissionId: string,
    dto: VerifySubmissionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!submission) throw new NotFoundException('Pengajuan tidak ditemukan');

    if (submission.status !== SubmissionStatus.MENUNGGU_VERIFIKASI) {
      throw new BadRequestException('Pengajuan ini sudah diverifikasi sebelumnya');
    }

    if (dto.action === VerifyAction.APPROVE) {
      if (!dto.actualWeight) {
        throw new BadRequestException('Berat aktual wajib diisi untuk menyetujui pengajuan');
      }

      const pointsEarned = Math.floor(
        dto.actualWeight * POINTS_PER_KG[submission.wasteType],
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.submission.update({
          where: { id: submissionId },
          data: {
            status: SubmissionStatus.DISETUJUI,
            actualWeight: dto.actualWeight,
            notes: dto.notes,
            reviewedById: officerId,
            reviewedAt: new Date(),
          },
        });

        await tx.user.update({
          where: { id: submission.userId },
          data: {
            pointBalance: { increment: pointsEarned },
            totalPointsEarned: { increment: pointsEarned },
          },
        });

        await tx.pointTransaction.create({
          data: {
            userId: submission.userId,
            submissionId,
            amount: pointsEarned,
            type: 'EARNED',
            description: `Sampah ${submission.wasteType} ${dto.actualWeight} kg disetujui`,
          },
        });
      });

      await this.email.sendSubmissionApproved(
        submission.user.email,
        submission.user.name,
        submission.wasteType,
        dto.actualWeight,
        pointsEarned,
      );

      return {
        message: 'Pengajuan disetujui',
        data: { pointsEarned },
      };
    } else {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.DITOLAK,
          notes: dto.notes,
          reviewedById: officerId,
          reviewedAt: new Date(),
        },
      });

      await this.email.sendSubmissionRejected(
        submission.user.email,
        submission.user.name,
        submission.wasteType,
        dto.notes ?? '',
      );

      return { message: 'Pengajuan ditolak' };
    }
  }

  async getDashboard() {
    const [
      totalPending,
      totalApproved,
      totalRejected,
      totalWeight,
      totalPoints,
      totalActiveUsers,
    ] = await Promise.all([
      this.prisma.submission.count({ where: { status: SubmissionStatus.MENUNGGU_VERIFIKASI } }),
      this.prisma.submission.count({ where: { status: SubmissionStatus.DISETUJUI } }),
      this.prisma.submission.count({ where: { status: SubmissionStatus.DITOLAK } }),
      this.prisma.submission.aggregate({
        where: { status: SubmissionStatus.DISETUJUI },
        _sum: { actualWeight: true },
      }),
      this.prisma.pointTransaction.aggregate({
        where: { type: 'EARNED' },
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { role: 'USER', isVerified: true } }),
    ]);

    return {
      message: 'Berhasil',
      data: {
        totalPending,
        totalApproved,
        totalRejected,
        totalWeightKg: totalWeight._sum.actualWeight ?? 0,
        totalPointsGiven: totalPoints._sum.amount ?? 0,
        totalActiveUsers,
      },
    };
  }
}
