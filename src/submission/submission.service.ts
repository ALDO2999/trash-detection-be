import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SubmissionService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubmissionDto) {
    const scanResult = await this.prisma.scanResult.findFirst({
      where: { id: dto.scanResultId, userId },
    });

    if (!scanResult) {
      throw new NotFoundException('Hasil scan tidak ditemukan');
    }

    const existing = await this.prisma.submission.findFirst({
      where: {
        scanResultId: dto.scanResultId,
        status: SubmissionStatus.MENUNGGU_VERIFIKASI,
      },
    });

    if (existing) {
      throw new BadRequestException('Pengajuan untuk scan ini sudah ada dan sedang menunggu verifikasi');
    }

    const submission = await this.prisma.submission.create({
      data: {
        userId,
        scanResultId: dto.scanResultId,
        wasteType: dto.wasteType,
        estimatedWeight: dto.estimatedWeight,
        imageUrl: scanResult.imageUrl,
      },
    });

    return {
      message: 'Pengajuan klaim berhasil dibuat',
      data: submission,
    };
  }

  async getMySubmissions(userId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        scanResult: {
          select: { predictedType: true, confidence: true },
        },
      },
    });

    return { data: submissions };
  }

  async getDetail(userId: string, submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, userId },
      include: {
        scanResult: {
          select: { predictedType: true, confidence: true, imageUrl: true },
        },
        reviewedBy: {
          select: { name: true },
        },
      },
    });

    if (!submission) throw new NotFoundException('Pengajuan tidak ditemukan');

    return { data: submission };
  }
}
