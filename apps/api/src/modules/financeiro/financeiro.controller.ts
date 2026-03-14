import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('financeiro')
@UseGuards(JwtAuthGuard)
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('resumo')
  getResumo(@GetUser() user: User) {
    return this.financeiroService.getResumoMes(user.id);
  }

  @Get('lancamentos')
  getLancamentos(
    @GetUser() user: User,
    @Query('tipo') tipo?: 'ENTRADA' | 'SAIDA',
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeiroService.getLancamentos(user.id, {
      tipo,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('lancamentos')
  createLancamento(
    @GetUser() user: User,
    @Body() dto: {
      tipo: 'ENTRADA' | 'SAIDA';
      valor: number;
      descricao: string;
      clienteId?: string;
      caseId?: string;
      vencimento?: string;
      categoria?: string;
    },
  ) {
    return this.financeiroService.createLancamento(user.id, dto);
  }

  @Patch('lancamentos/:id')
  updateLancamento(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<{ status: string; pagoEm: string; descricao: string; valor: number }>,
  ) {
    return this.financeiroService.updateLancamento(id, user.id, dto);
  }

  @Delete('lancamentos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLancamento(@GetUser() user: User, @Param('id') id: string) {
    return this.financeiroService.deleteLancamento(id, user.id);
  }
}
