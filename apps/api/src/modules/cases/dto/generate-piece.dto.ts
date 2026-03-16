import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { PieceType } from '@prisma/client';

export type PieceStyle = 'formal_classico' | 'moderno' | 'agressivo' | 'tecnico' | 'custom';

export class GeneratePieceDto {
  @IsEnum(PieceType)
  pieceType: PieceType;

  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  instructions?: string;

  @IsOptional()
  @IsEnum(['formal_classico', 'moderno', 'agressivo', 'tecnico', 'custom'])
  style?: PieceStyle;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customStyle?: string;
}
