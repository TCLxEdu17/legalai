import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max, MaxLength } from 'class-validator';

export class CreateRadarDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  thesisText: string;

  @IsOptional()
  @IsNumber()
  @Min(0.6)
  @Max(1.0)
  threshold?: number;

  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
