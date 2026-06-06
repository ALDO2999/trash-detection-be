import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { OfficerService } from './officer.service';
import { VerifySubmissionDto } from './dto/verify-submission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('officer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PETUGAS')
export class OfficerController {
  constructor(private officerService: OfficerService) {}

  @Get('dashboard')
  getDashboard() {
    return this.officerService.getDashboard();
  }

  @Get('submissions')
  getSubmissions(@Query('status') status?: SubmissionStatus) {
    return this.officerService.getSubmissions(status);
  }

  @Get('submissions/:id')
  getSubmissionDetail(@Param('id') submissionId: string) {
    return this.officerService.getSubmissionDetail(submissionId);
  }

  @Patch('submissions/:id/verify')
  @HttpCode(HttpStatus.OK)
  verifySubmission(
    @CurrentUser('id') officerId: string,
    @Param('id') submissionId: string,
    @Body() dto: VerifySubmissionDto,
  ) {
    return this.officerService.verifySubmission(officerId, submissionId, dto);
  }
}
