import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { IsString, IsOptional, IsArray, IsBoolean, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

class UploadDocumentDto {
  @ApiProperty({ description: 'Título do documento' })
  @IsString({ message: 'O título deve ser um texto' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MinLength(3, { message: 'O título deve ter pelo menos 3 caracteres' })
  @MaxLength(200, { message: 'O título deve ter no máximo 200 caracteres' })
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'O tribunal deve ser um texto' })
  @MaxLength(100, { message: 'O tribunal deve ter no máximo 100 caracteres' })
  tribunal?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'O número do processo deve ser um texto' })
  @MaxLength(100, { message: 'O número do processo deve ter no máximo 100 caracteres' })
  processNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'O relator deve ser um texto' })
  @MaxLength(200, { message: 'O nome do relator deve ter no máximo 200 caracteres' })
  relator?: string;

  @ApiProperty({ required: false, description: 'Formato: YYYY-MM-DD' })
  @IsOptional()
  @IsString({ message: 'A data de julgamento deve ser um texto' })
  judgmentDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'O tema deve ser um texto' })
  @MaxLength(200, { message: 'O tema deve ter no máximo 200 caracteres' })
  theme?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((k: string) => k.trim()) : value,
  )
  keywords?: string[];

  @ApiProperty({ required: false, description: 'Extrair metadados automaticamente via IA' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  autoExtractMetadata?: boolean;
}

@ApiTags('uploads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload de jurisprudência' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        tribunal: { type: 'string' },
        processNumber: { type: 'string' },
        relator: { type: 'string' },
        judgmentDate: { type: 'string' },
        theme: { type: 'string' },
        keywords: { type: 'string', description: 'Separadas por vírgula' },
        autoExtractMetadata: { type: 'boolean' },
      },
      required: ['file', 'title'],
    },
  })
  @ApiResponse({ status: 201, description: 'Upload iniciado' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.uploadsService.processUpload(file, dto, userId);
  }

  @Post(':id/reindex')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Reindexar um documento (admin)' })
  async reindex(@Param('id') id: string) {
    await this.uploadsService.reindex(id);
    return { message: 'Reindexação iniciada' };
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analisar documento com IA (todos os usuários autenticados)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Análise do documento' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.uploadsService.analyzeDocument(file);
  }
}
