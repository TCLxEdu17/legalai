import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PredictCompensationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tipo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  estado: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  duracao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detalhes?: string;
}
