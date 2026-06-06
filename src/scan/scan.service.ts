import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ScanService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  async scan(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Gambar wajib diupload');

    const prediction = await this.ai.predict(file.buffer);

    // Simpan file ke disk setelah inference
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `scan-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);

    const imageUrl = `/uploads/${filename}`;

    const scanResult = await this.prisma.scanResult.create({
      data: {
        userId,
        imageUrl,
        predictedType: prediction.wasteType,
        confidence: prediction.confidence,
      },
    });

    return {
      message: 'Scan berhasil',
      data: {
        scanResultId: scanResult.id,
        imageUrl: scanResult.imageUrl,
        predictedType: prediction.wasteType,
        label: prediction.label,
        confidence: prediction.confidence,
        allPredictions: prediction.allPredictions,
      },
    };
  }

  async getHistory(userId: string) {
    const results = await this.prisma.scanResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        submissions: {
          select: { id: true, status: true },
        },
      },
    });

    return { data: results };
  }

  async getDetail(userId: string, scanResultId: string) {
    const result = await this.prisma.scanResult.findFirst({
      where: { id: scanResultId, userId },
      include: {
        submissions: {
          select: { id: true, status: true, createdAt: true },
        },
      },
    });

    if (!result) throw new BadRequestException('Hasil scan tidak ditemukan');

    return { data: result };
  }
}
