import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('clients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  findAll(@CurrentUser('id') userId: string, @Query('search') search?: string) {
    return this.clientsService.findAll(userId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do cliente' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.clientsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar cliente' })
  create(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.clientsService.create(userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.clientsService.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir cliente' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.clientsService.remove(userId, id);
  }
}
