import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageRole } from '@prisma/client';

// Mensagem exibida ao usuário quando o pipeline RAG falha
const RAG_ERROR_MESSAGE =
  'Ocorreu um erro ao processar sua consulta. Por favor, tente novamente em instantes. ' +
  'Se o problema persistir, verifique se há documentos indexados na base.';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
  ) {}

  async sendMessage(dto: SendMessageDto, userId: string) {
    // Obter ou criar sessão
    let session = dto.sessionId
      ? await this.getSession(dto.sessionId, userId)
      : null;

    if (!session) {
      session = await this.createSession(userId, dto.message);
    }

    // Salvar mensagem do usuário
    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: MessageRole.USER,
        content: dto.message,
      },
    });

    // Buscar histórico recente para contexto
    const history = await this.getRecentHistory(session.id);

    // Executar RAG — isolado em try-catch para nunca crashar o endpoint
    const ragStart = Date.now();
    this.logger.log(
      `[RAG] Início | sessão=${session.id} | user=${userId} | pergunta="${dto.message.slice(0, 80)}..."`,
    );

    let ragResult: Awaited<ReturnType<RagService['query']>>;
    let ragFailed = false;

    try {
      ragResult = await this.ragService.query(dto.message, history);
      const ragElapsed = Date.now() - ragStart;
      this.logger.log(
        `[RAG] Concluído | ${ragElapsed}ms | chunks=${ragResult.retrievedChunks} | confiança=${ragResult.confidence} | modelo=${ragResult.model} | tokens=in:${ragResult.tokensUsed.input} out:${ragResult.tokensUsed.output}`,
      );
    } catch (err: any) {
      ragFailed = true;
      const ragElapsed = Date.now() - ragStart;
      this.logger.error(
        `[RAG] FALHA | ${ragElapsed}ms | sessão=${session.id} | user=${userId} | erro=${err?.message ?? err}`,
        err?.stack,
      );
      // Fallback: resposta de erro amigável
      ragResult = {
        answer: RAG_ERROR_MESSAGE,
        sources: [],
        retrievedChunks: 0,
        confidence: 'none',
        tokensUsed: { input: 0, output: 0 },
        model: 'error',
      };
    }

    // Salvar resposta do assistente (mesmo em caso de falha — mantém consistência do histórico)
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: MessageRole.ASSISTANT,
        content: ragResult.answer,
        sources: ragResult.sources as any,
        metadata: {
          confidence: ragResult.confidence,
          retrievedChunks: ragResult.retrievedChunks,
          tokensUsed: ragResult.tokensUsed,
          model: ragResult.model,
          error: ragFailed,
        } as any,
      },
    });

    // Atualizar título da sessão na primeira mensagem (não crítico — falha silenciosamente)
    if (!dto.sessionId) {
      this.updateSessionTitle(session.id, dto.message).catch((e) =>
        this.logger.warn(`[Chat] Falha ao atualizar título da sessão: ${e?.message}`),
      );
    }

    return {
      sessionId: session.id,
      message: {
        id: assistantMessage.id,
        content: ragResult.answer,
        sources: ragResult.sources,
        confidence: ragResult.confidence,
        retrievedChunks: ragResult.retrievedChunks,
        createdAt: assistantMessage.createdAt,
        error: ragFailed,
      },
    };
  }

  async getSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async getSessionMessages(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
      },
      messages,
    };
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await this.getSession(sessionId, userId);
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  private async createSession(userId: string, _firstMessage: string) {
    return this.prisma.chatSession.create({
      data: {
        userId,
        title: 'Nova consulta',
      },
    });
  }

  private async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Sessão ${sessionId} não encontrada`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Acesso negado a esta sessão');
    }

    return session;
  }

  private async getRecentHistory(sessionId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });

    return messages.reverse().map((m) => ({
      role: m.role === MessageRole.USER ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));
  }

  private async updateSessionTitle(sessionId: string, firstMessage: string) {
    const title =
      firstMessage.length > 60
        ? firstMessage.slice(0, 57) + '...'
        : firstMessage;

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
    });
  }
}
