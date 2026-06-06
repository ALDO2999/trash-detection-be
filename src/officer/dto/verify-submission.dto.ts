import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum VerifyAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class VerifySubmissionDto {
  @IsEnum(VerifyAction)
  action: VerifyAction;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  actualWeight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
