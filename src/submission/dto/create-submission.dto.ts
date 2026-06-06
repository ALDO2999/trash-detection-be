import { WasteType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubmissionDto {
  @IsNotEmpty()
  @IsString()
  scanResultId: string;

  @IsEnum(WasteType)
  wasteType: WasteType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedWeight?: number;
}
