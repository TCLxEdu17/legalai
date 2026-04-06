import { IsString, IsNotEmpty, IsEnum, MinLength, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString({ message: 'A descrição deve ser um texto' })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @MinLength(20, { message: 'Descreva o problema com pelo menos 20 caracteres' })
  @MaxLength(2000, { message: 'A descrição deve ter no máximo 2000 caracteres' })
  description: string;

  @IsEnum(['bug', 'feature', 'ux', 'performance', 'other'], { message: 'Categoria inválida' })
  category: 'bug' | 'feature' | 'ux' | 'performance' | 'other';

  @IsEnum(['low', 'medium', 'high', 'critical'], { message: 'Severidade inválida' })
  severity: 'low' | 'medium' | 'high' | 'critical';
}
