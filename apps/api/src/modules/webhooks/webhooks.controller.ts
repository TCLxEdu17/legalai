import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('webhooks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'Listar webhooks do usuário' })
  getUserWebhooks(@CurrentUser('id') userId: string) {
    return this.webhooksService.getUserWebhooks(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar webhook' })
  createWebhook(
    @CurrentUser('id') userId: string,
    @Body() body: { url: string; events: string[] },
  ) {
    return this.webhooksService.createWebhook(userId, body.url, body.events);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir webhook' })
  deleteWebhook(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.webhooksService.deleteWebhook(userId, id);
  }
}
