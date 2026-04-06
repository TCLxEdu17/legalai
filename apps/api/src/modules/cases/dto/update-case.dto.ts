import { IsString, IsOptional, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { CaseStatus } from '@prisma/client';

export class UpdateCaseDto {
  @IsOptional()
  @IsString({ message: 'O título deve ser um texto' })
  @MaxLength(200, { message: 'O título deve ter no máximo 200 caracteres' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'A área deve ser um texto' })
  @MaxLength(100, { message: 'A área deve ter no máximo 100 caracteres' })
  area?: string;

  @IsOptional()
  @IsEnum(CaseStatus, { message: 'O status deve ser um valor válido' })
  status?: CaseStatus;

  @IsOptional()
  @IsString({ message: 'O número do processo deve ser um texto' })
  @MaxLength(100, { message: 'O número do processo deve ter no máximo 100 caracteres' })
  processNumber?: string;

  @IsOptional()
  @IsString({ message: 'O tribunal deve ser um texto' })
  @MaxLength(200, { message: 'O tribunal deve ter no máximo 200 caracteres' })
  court?: string;

  @IsOptional()
  @IsString({ message: 'O juiz deve ser um texto' })
  @MaxLength(200, { message: 'O nome do juiz deve ter no máximo 200 caracteres' })
  judge?: string;

  @IsOptional()
  @IsString({ message: 'O autor deve ser um texto' })
  @MaxLength(200, { message: 'O nome do autor deve ter no máximo 200 caracteres' })
  plaintiff?: string;

  @IsOptional()
  @IsString({ message: 'O réu deve ser um texto' })
  @MaxLength(200, { message: 'O nome do réu deve ter no máximo 200 caracteres' })
  defendant?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O valor da causa deve ser um número' })
  caseValue?: number;

  @IsOptional()
  @IsString({ message: 'A estratégia deve ser um texto' })
  @MaxLength(5000, { message: 'A estratégia deve ter no máximo 5000 caracteres' })
  strategy?: string;

  @IsOptional()
  @IsString({ message: 'As observações devem ser um texto' })
  @MaxLength(5000, { message: 'As observações devem ter no máximo 5000 caracteres' })
  notes?: string;
}
