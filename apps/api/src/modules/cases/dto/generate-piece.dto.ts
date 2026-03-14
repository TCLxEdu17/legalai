import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { PieceType } from '@prisma/client';

export class GeneratePieceDto {
  @IsEnum(PieceType)
  pieceType: PieceType;

  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  instructions?: string; // Instrução específica do advogado
}
