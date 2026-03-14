import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { CaseStatus } from '@prisma/client';

export class CreateCaseDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsOptional()
  @IsString()
  court?: string;

  @IsOptional()
  @IsString()
  judge?: string;

  @IsOptional()
  @IsString()
  plaintiff?: string;

  @IsOptional()
  @IsString()
  defendant?: string;

  @IsOptional()
  caseValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
