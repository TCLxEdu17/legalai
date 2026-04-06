import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsUrl,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COLLECTOR_TYPES } from '../../collectors/collector.interface';

export class CreateSourceDto {
  @ApiProperty({ example: 'STJ — Jurisprudências' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Jurisprudências do Superior Tribunal de Justiça' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'https://stj.jus.br/sites/portalp/Paginas/jurisprudencia.aspx' })
  @IsString({ message: 'A URL base deve ser um texto' })
  @IsNotEmpty({ message: 'A URL base é obrigatória' })
  @IsUrl({}, { message: 'A URL base deve ser uma URL válida' })
  @MaxLength(500, { message: 'A URL base deve ter no máximo 500 caracteres' })
  baseUrl: string;

  @ApiProperty({ enum: Object.values(COLLECTOR_TYPES), example: 'html-list' })
  @IsString()
  @IsIn(Object.values(COLLECTOR_TYPES))
  sourceType: string;

  @ApiPropertyOptional({ example: '0 2 * * *', description: 'Expressão cron para agendamento' })
  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Configurações extras do coletor (seletores CSS, filtros, etc.)',
    example: { listSelector: 'a.ementa', contentSelector: '.texto-ementa', maxPages: 5 },
  })
  @IsOptional()
  @IsObject()
  configJson?: Record<string, any>;
}
