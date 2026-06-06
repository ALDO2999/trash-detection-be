import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ScanService } from './scan.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('scan')
@UseGuards(JwtAuthGuard)
export class ScanController {
  constructor(private scanService: ScanService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Hanya file gambar yang diizinkan'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  scan(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.scanService.scan(userId, file);
  }

  @Get('history')
  getHistory(@CurrentUser('id') userId: string) {
    return this.scanService.getHistory(userId);
  }

  @Get(':id')
  getDetail(
    @CurrentUser('id') userId: string,
    @Param('id') scanResultId: string,
  ) {
    return this.scanService.getDetail(userId, scanResultId);
  }
}
