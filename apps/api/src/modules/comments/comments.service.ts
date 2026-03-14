import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDocumentComments(documentId: string, userId: string) {
    return this.prisma.documentComment.findMany({
      where: { documentId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addComment(documentId: string, userId: string, content: string) {
    return this.prisma.documentComment.create({
      data: { documentId, userId, content },
    });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.documentComment.findFirst({ where: { id, userId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    await this.prisma.documentComment.delete({ where: { id } });
  }
}
