import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { ScanModule } from './scan/scan.module';
import { SubmissionModule } from './submission/submission.module';
import { OfficerModule } from './officer/officer.module';
import { PointsModule } from './points/points.module';
import { VoucherModule } from './voucher/voucher.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    ScanModule,
    SubmissionModule,
    OfficerModule,
    PointsModule,
    VoucherModule,
    UserModule,
  ],
})
export class AppModule {}
