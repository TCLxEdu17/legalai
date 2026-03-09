import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IngestionService } from './ingestion.service';

@ApiTags('Ingestão')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('sources/run-all')
  @ApiOperation({ summary: 'Executar ingestão de todas as fontes ativas' })
  async runAll() {
    const count = await this.ingestionService.runAllActiveSources();
    return { message: `Ingestão iniciada para ${count} fonte(s) ativa(s).`, count };
  }

  @Post('jobs/cleanup-orphans')
  @ApiOperation({ summary: 'Resolver jobs órfãos presos em RUNNING' })
  async cleanupOrphans() {
    const count = await this.ingestionService.cleanupOrphanedJobs();
    return { message: `${count} jobs órfãos resolvidos`, count };
  }

  @Post('sources/:sourceId/run')
  @ApiOperation({ summary: 'Executar ingestão manual de uma fonte' })
  @ApiParam({ name: 'sourceId', type: String })
  runSource(@Param('sourceId', ParseUUIDPipe) sourceId: string) {
    this.ingestionService.runForSource(sourceId, 'MANUAL').catch(() => {});
    return { message: 'Ingestão iniciada. Acompanhe em /ingestion/jobs' };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Listar todos os jobs de ingestão' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sourceId', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sourceId') sourceId?: string,
  ) {
    return this.ingestionService.findAllJobs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      sourceId,
    );
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Detalhar um job de ingestão' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ingestionService.findJobById(id);
  }
}
