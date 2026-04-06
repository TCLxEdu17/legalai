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
import { TarefasService } from './tarefas.service';
import { CreateTarefaDto, UpdateTarefaDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('tarefas')
@UseGuards(JwtAuthGuard)
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Get()
  getTarefas(
    @CurrentUser() user: User,
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
  getVencendo(@CurrentUser() user: User) {
    return this.tarefasService.getVencendo(user.id);
  }

  @Post()
  createTarefa(@CurrentUser() user: User, @Body() dto: CreateTarefaDto) {
    return this.tarefasService.createTarefa(user.id, dto);
  }

  @Patch(':id')
  updateTarefa(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTarefaDto,
  ) {
    return this.tarefasService.updateTarefa(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTarefa(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tarefasService.deleteTarefa(id, user.id);
  }
}
