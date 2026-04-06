import { IsString, IsOptional, IsNumber, IsDateString, Min, IsEnum } from 'class-validator';

export class UpdateLancamentoDto {
  @IsOptional()
  @IsEnum(['PENDENTE', 'PAGO', 'CANCELADO'], { message: 'O status deve ser PENDENTE, PAGO ou CANCELADO' })
  status?: 'PENDENTE' | 'PAGO' | 'CANCELADO';

  @IsOptional()
  @IsDateString({}, { message: 'A data de pagamento deve ser uma data valida' })
  pagoEm?: string;

  @IsOptional()
  @IsString({ message: 'A descricao deve ser um texto' })
  descricao?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O valor deve ser um numero' })
  @Min(0.01, { message: 'O valor deve ser maior que zero' })
  valor?: number;
}
