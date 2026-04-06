import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateTarefaDto {
  @IsString() titulo: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() caseId?: string;
  @IsOptional() @IsDateString() prazo?: string;
  @IsOptional() @IsEnum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']) prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
}
