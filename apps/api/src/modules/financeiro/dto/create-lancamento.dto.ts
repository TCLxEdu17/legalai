import { IsString, IsOptional, IsNumber, IsDateString, IsNotEmpty, Min, MaxLength, IsEnum } from 'class-validator';

export class CreateLancamentoDto {
  @IsEnum(['ENTRADA', 'SAIDA'], { message: 'O tipo deve ser ENTRADA ou SAIDA' })
  tipo: 'ENTRADA' | 'SAIDA';

  @IsNumber({}, { message: 'O valor deve ser um numero' })
  @Min(0.01, { message: 'O valor deve ser maior que zero' })
  valor: number;

  @IsString({ message: 'A descricao deve ser um texto' })
  @IsNotEmpty({ message: 'A descricao e obrigatoria' })
  @MaxLength(500, { message: 'A descricao deve ter no maximo 500 caracteres' })
  descricao: string;

  @IsOptional()
  @IsString({ message: 'O ID do cliente deve ser um texto' })
  clienteId?: string;

  @IsOptional()
  @IsString({ message: 'O ID do caso deve ser um texto' })
  caseId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'O vencimento deve ser uma data valida' })
  vencimento?: string;

  @IsOptional()
  @IsString({ message: 'A categoria deve ser um texto' })
  @MaxLength(100, { message: 'A categoria deve ter no maximo 100 caracteres' })
  categoria?: string;
}
