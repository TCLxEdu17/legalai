import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Enviar mensagem ao assistente jurídico' })
  @ApiResponse({ status: 201, description: 'Resposta gerada com sucesso' })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.sendMessage(dto, userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Listar sessões de chat do usuário' })
  getSessions(@CurrentUser('id') userId: string) {
    return this.chatService.getSessions(userId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Mensagens de uma sessão de chat' })
  getSessionMessages(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.getSessionMessages(sessionId, userId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerrar sessão de chat' })
  deleteSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.deleteSession(sessionId, userId);
  }
}
