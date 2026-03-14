import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('comments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar comentários do usuário no documento' })
  getComments(@Param('documentId') documentId: string, @CurrentUser('id') userId: string) {
    return this.commentsService.getDocumentComments(documentId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Adicionar comentário' })
  addComment(
    @Param('documentId') documentId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string },
  ) {
    return this.commentsService.addComment(documentId, userId, body.content);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir comentário' })
  deleteComment(@Param('commentId') id: string, @CurrentUser('id') userId: string) {
    return this.commentsService.deleteComment(id, userId);
  }
}
