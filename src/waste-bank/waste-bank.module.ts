import { Module } from '@nestjs/common';
import { WasteBankService } from './waste-bank.service';
import { WasteBankController } from './waste-bank.controller';

@Module({
  controllers: [WasteBankController],
  providers: [WasteBankService],
})
export class WasteBankModule {}
