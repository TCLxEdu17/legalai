import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HearingsService } from './hearings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('hearings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hearings')
export class HearingsController {
  constructor(private readonly hearingsService: HearingsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar audiências do usuário' })
  findAll(@CurrentUser('id') userId: string) {
    return this.hearingsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar audiência' })
  create(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.hearingsService.create(userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar audiência' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.hearingsService.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir audiência' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.hearingsService.remove(userId, id);
  }
}
