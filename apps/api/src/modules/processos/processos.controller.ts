import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProcessosService } from './processos.service';

@ApiTags('processos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('processos')
export class ProcessosController {
  constructor(private readonly processos: ProcessosService) {}

  @Get(':numero')
  @ApiOperation({ summary: 'Consulta processo pelo número CNJ via DataJud' })
  @ApiParam({ name: 'numero', description: 'Número CNJ com ou sem formatação', example: '0000001-00.2025.8.26.0100' })
  async consultar(@Param('numero') numero: string) {
    return this.processos.consultar(numero);
  }
}
