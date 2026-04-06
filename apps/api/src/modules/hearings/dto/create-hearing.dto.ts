import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateHearingDto {
  @IsString() title: string;
  @IsOptional() @IsString() client?: string;
  @IsOptional() @IsString() processNumber?: string;
  @IsOptional() @IsString() court?: string;
  @IsDateString() date: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() notes?: string;
}
