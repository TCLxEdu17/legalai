import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProcessosService } from './processos.service';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('processos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('processos')
export class ProcessosController {
  constructor(
    private readonly processos: ProcessosService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get(':numero')
  @ApiOperation({ summary: 'Consulta processo pelo número CNJ via DataJud' })
  @ApiParam({ name: 'numero', description: 'Número CNJ com ou sem formatação', example: '0000001-00.2025.8.26.0100' })
  async consultar(@Param('numero') numero: string) {
    return this.processos.consultar(numero);
  }

  @Post('saved')
  @ApiOperation({ summary: 'Salvar processo para monitoramento' })
  async save(@Request() req: any, @Body() body: { number: string; title?: string; area?: string }) {
    return this.processos.saveProcess(req.user.id, body);
  }

  @Get('saved/list')
  @ApiOperation({ summary: 'Listar processos monitorados' })
  async list(@Request() req: any) {
    return this.processos.listSavedProcesses(req.user.id);
  }

  @Delete('saved/:id')
  @ApiOperation({ summary: 'Remover processo do monitoramento' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.processos.deleteSavedProcess(req.user.id, id);
  }

  @Post('saved/check-all')
  @ApiOperation({ summary: 'Verificar atualizações de todos os processos monitorados' })
  async checkAll() {
    return this.processos.checkAndNotify(this.notifications as any);
  }
}
