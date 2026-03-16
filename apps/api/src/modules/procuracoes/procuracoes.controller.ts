import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcuracoesService, GenerateProcuracaoDto, EnviarAssinaturaDto } from './procuracoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('procuracoes')
@UseGuards(JwtAuthGuard)
export class ProcuracoesController {
  constructor(private readonly procuracoesService: ProcuracoesService) {}

  @Post('gerar')
  @HttpCode(HttpStatus.OK)
  gerar(@Body() dto: GenerateProcuracaoDto) {
    const procuracao = this.procuracoesService.generateProcuracao(dto);
    return { procuracao };
  }

  @Post('enviar-assinatura')
  @HttpCode(HttpStatus.OK)
  enviarAssinatura(@Body() dto: EnviarAssinaturaDto) {
    return this.procuracoesService.enviarAssinatura(dto);
  }
}
