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
import { CreateLancamentoDto, UpdateLancamentoDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('financeiro')
@UseGuards(JwtAuthGuard)
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('resumo')
  getResumo(@CurrentUser() user: User) {
    return this.financeiroService.getResumoMes(user.id);
  }

  @Get('lancamentos')
  getLancamentos(
    @CurrentUser() user: User,
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
    @CurrentUser() user: User,
    @Body() dto: CreateLancamentoDto,
  ) {
    return this.financeiroService.createLancamento(user.id, dto);
  }

  @Patch('lancamentos/:id')
  updateLancamento(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateLancamentoDto,
  ) {
    return this.financeiroService.updateLancamento(id, user.id, dto);
  }

  @Delete('lancamentos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLancamento(@CurrentUser() user: User, @Param('id') id: string) {
    return this.financeiroService.deleteLancamento(id, user.id);
  }
}
