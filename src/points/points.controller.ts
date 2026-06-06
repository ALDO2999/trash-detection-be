import { Controller, Get, UseGuards } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Get('balance')
  getBalance(@CurrentUser('id') userId: string) {
    return this.pointsService.getBalance(userId);
  }

  @Get('history')
  getHistory(@CurrentUser('id') userId: string) {
    return this.pointsService.getHistory(userId);
  }
}
