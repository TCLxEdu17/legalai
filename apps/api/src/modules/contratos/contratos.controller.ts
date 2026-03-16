import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ContratosService, GenerateContratoDto } from './contratos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contratos')
@UseGuards(JwtAuthGuard)
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Post('gerar')
  @HttpCode(HttpStatus.OK)
  gerar(@Body() dto: GenerateContratoDto) {
    const contrato = this.contratosService.generateContrato(dto);
    return { contrato };
  }
}
