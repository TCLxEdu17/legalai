import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateHearingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  witnessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  witnessRole?: string;
}
