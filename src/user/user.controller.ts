import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser('id') userId: string) {
    return this.userService.getDashboard(userId);
  }

  @Get('leaderboard')
  getLeaderboard(@CurrentUser('id') userId: string) {
    return this.userService.getLeaderboard(userId);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: { name?: string; phone?: string },
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  @Patch('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
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
  updateAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.updateAvatar(userId, file);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Delete('account')
  deleteAccount(@CurrentUser('id') userId: string) {
    return this.userService.deleteAccount(userId);
  }
}
