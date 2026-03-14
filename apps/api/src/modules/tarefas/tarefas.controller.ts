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
import { TarefasService, CreateTarefaDto } from './tarefas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('tarefas')
@UseGuards(JwtAuthGuard)
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Get()
  getTarefas(
    @GetUser() user: User,
    @Query('caseId') caseId?: string,
    @Query('status') status?: any,
    @Query('prioridade') prioridade?: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tarefasService.getTarefas(user.id, {
      caseId,
      status,
      prioridade,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('vencendo')
  getVencendo(@GetUser() user: User) {
    return this.tarefasService.getVencendo(user.id);
  }

  @Post()
  createTarefa(@GetUser() user: User, @Body() dto: CreateTarefaDto) {
    return this.tarefasService.createTarefa(user.id, dto);
  }

  @Patch(':id')
  updateTarefa(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<{
      titulo: string;
      descricao: string;
      prazo: string;
      prioridade: string;
      status: string;
      concluidaEm: string;
    }>,
  ) {
    return this.tarefasService.updateTarefa(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTarefa(@GetUser() user: User, @Param('id') id: string) {
    return this.tarefasService.deleteTarefa(id, user.id);
  }
}
