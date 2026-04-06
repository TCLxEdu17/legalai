import { IsString, IsOptional, IsDateString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateHearingDto {
  @IsString({ message: 'O título deve ser um texto' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MinLength(2, { message: 'O título deve ter pelo menos 2 caracteres' })
  @MaxLength(200, { message: 'O título deve ter no máximo 200 caracteres' })
  title: string;

  @IsOptional()
  @IsString({ message: 'O cliente deve ser um texto' })
  @MaxLength(200, { message: 'O nome do cliente deve ter no máximo 200 caracteres' })
  client?: string;

  @IsOptional()
  @IsString({ message: 'O número do processo deve ser um texto' })
  @MaxLength(100, { message: 'O número do processo deve ter no máximo 100 caracteres' })
  processNumber?: string;

  @IsOptional()
  @IsString({ message: 'O tribunal deve ser um texto' })
  @MaxLength(200, { message: 'O tribunal deve ter no máximo 200 caracteres' })
  court?: string;

  @IsDateString({}, { message: 'A data da audiência deve ser uma data válida (ISO 8601)' })
  date: string;

  @IsOptional()
  @IsString({ message: 'O local deve ser um texto' })
  @MaxLength(200, { message: 'O local deve ter no máximo 200 caracteres' })
  location?: string;

  @IsOptional()
  @IsString({ message: 'As observações devem ser um texto' })
  @MaxLength(1000, { message: 'As observações devem ter no máximo 1000 caracteres' })
  notes?: string;
}
