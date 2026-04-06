import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { PieceType } from '@prisma/client';

export type PieceStyle = 'formal_classico' | 'moderno' | 'agressivo' | 'tecnico' | 'custom';

export class GeneratePieceDto {
  @IsEnum(PieceType, { message: 'O tipo de peça deve ser um valor válido' })
  pieceType: PieceType;

  @IsString({ message: 'O título deve ser um texto' })
  @MinLength(2, { message: 'O título deve ter pelo menos 2 caracteres' })
  @MaxLength(300, { message: 'O título deve ter no máximo 300 caracteres' })
  title: string;

  @IsOptional()
  @IsString({ message: 'As instruções devem ser um texto' })
  @MaxLength(3000, { message: 'As instruções devem ter no máximo 3000 caracteres' })
  instructions?: string;

  @IsOptional()
  @IsEnum(['formal_classico', 'moderno', 'agressivo', 'tecnico', 'custom'], { message: 'O estilo deve ser formal_classico, moderno, agressivo, tecnico ou custom' })
  style?: PieceStyle;

  @IsOptional()
  @IsString({ message: 'O estilo personalizado deve ser um texto' })
  @MaxLength(500, { message: 'O estilo personalizado deve ter no máximo 500 caracteres' })
  customStyle?: string;
}
