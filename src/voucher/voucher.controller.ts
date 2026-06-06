import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('vouchers')
@UseGuards(JwtAuthGuard)
export class VoucherController {
  constructor(private voucherService: VoucherService) {}

  @Get()
  getAll() {
    return this.voucherService.getAll();
  }

  @Post(':id/redeem')
  redeem(
    @CurrentUser('id') userId: string,
    @Param('id') voucherId: string,
  ) {
    return this.voucherService.redeem(userId, voucherId);
  }

  @Get('my-redemptions')
  getMyRedemptions(@CurrentUser('id') userId: string) {
    return this.voucherService.getMyRedemptions(userId);
  }
}
