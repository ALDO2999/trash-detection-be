import { Controller, Get, UseGuards } from '@nestjs/common';
import { WasteBankService } from './waste-bank.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('waste-banks')
@UseGuards(JwtAuthGuard)
export class WasteBankController {
  constructor(private wasteBankService: WasteBankService) {}

  @Get()
  findAll() {
    return this.wasteBankService.findAll();
  }
}
