import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar jurisprudências com filtros e paginação' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tribunal', required: false, type: String })
  @ApiQuery({ name: 'theme', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tribunal') tribunal?: string,
    @Query('theme') theme?: string,
    @Query('status') status?: string,
  ) {
    return this.documentsService.findAll({ page, limit, search, tribunal, theme, status });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas da base de jurisprudências' })
  getStats() {
    return this.documentsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma jurisprudência' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Post(':id/summary')
  @ApiOperation({ summary: 'Gerar resumo executivo de um documento via IA' })
  async generateSummary(@Param('id') id: string) {
    return this.documentsService.generateSummary(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir jurisprudência (admin)' })
  @ApiResponse({ status: 204, description: 'Deletado com sucesso' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    await this.documentsService.delete(id, userId, userRole);
  }
}
