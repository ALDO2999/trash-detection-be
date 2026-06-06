import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionController {
  constructor(private submissionService: SubmissionService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissionService.create(userId, dto);
  }

  @Get()
  getMySubmissions(@CurrentUser('id') userId: string) {
    return this.submissionService.getMySubmissions(userId);
  }

  @Get(':id')
  getDetail(
    @CurrentUser('id') userId: string,
    @Param('id') submissionId: string,
  ) {
    return this.submissionService.getDetail(userId, submissionId);
  }
}
