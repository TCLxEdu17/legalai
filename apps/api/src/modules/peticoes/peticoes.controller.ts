import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PeticoesService } from './peticoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('peticoes')
@UseGuards(JwtAuthGuard)
export class PeticoesController {
  constructor(private readonly peticoesService: PeticoesService) {}

  @Post('checklist')
  @HttpCode(HttpStatus.OK)
  getChecklist(@Body() body: { tipo: string }) {
    return { checklist: this.peticoesService.getChecklistPeticao(body.tipo) };
  }

  @Post('contexto')
  @HttpCode(HttpStatus.OK)
  buildContext(@Body() body: { tipo: string; caso: any }) {
    return this.peticoesService.buildPeticaoContext(body);
  }
}
