import { IsString, IsOptional, IsDateString, IsEnum, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateTarefaDto {
  @IsString({ message: 'O título deve ser um texto' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MinLength(2, { message: 'O título deve ter pelo menos 2 caracteres' })
  @MaxLength(200, { message: 'O título deve ter no máximo 200 caracteres' })
  titulo: string;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
  descricao?: string;

  @IsOptional()
  @IsString({ message: 'O ID do caso deve ser um texto' })
  caseId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'O prazo deve ser uma data válida (ISO 8601)' })
  prazo?: string;

  @IsOptional()
  @IsEnum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'], { message: 'A prioridade deve ser BAIXA, MEDIA, ALTA ou URGENTE' })
  prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
}
