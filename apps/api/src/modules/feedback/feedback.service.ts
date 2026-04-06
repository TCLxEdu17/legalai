import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeedbackDto, userId: string) {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        description: dto.description,
        category: dto.category,
        severity: dto.severity,
      },
    });

    this.logger.log(`Feedback recebido de usuário ${userId}: ${dto.category} (${dto.severity})`);
    return { id: feedback.id, message: 'Feedback enviado com sucesso' };
  }
}
