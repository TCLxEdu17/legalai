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
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

class UploadDocumentDto {
  @ApiProperty({ description: 'Título do documento' })
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tribunal?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  processNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relator?: string;

  @ApiProperty({ required: false, description: 'Formato: YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  judgmentDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload de jurisprudência (admin)' })
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
}
