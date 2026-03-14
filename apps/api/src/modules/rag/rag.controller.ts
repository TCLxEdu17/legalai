import { Controller, Post, Body, UseGuards, Inject, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AI_PROVIDER_TOKEN, IAIProvider } from './providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@ApiTags('rag')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
    private readonly prisma: PrismaService,
  ) {}

  @Post('review')
  @ApiOperation({ summary: 'Revisão jurídica de peça processual via IA' })
  async reviewPeca(@Body() body: { text: string }) {
    const prompt = `Você é um revisor jurídico especialista. Analise a peça processual abaixo e identifique: 1) Inconsistências jurídicas, 2) Erros de fundamentação, 3) Lacunas argumentativas, 4) Sugestões de melhoria. Seja específico e cite trechos.\n\nPeça:\n${body.text.slice(0, 12000)}`;
    const result = await this.aiProvider.generateChatCompletion([{ role: 'user', content: prompt }], { temperature: 0.3 });
    return { review: result.content };
  }

  @Post('review-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload e revisão de peça processual (PDF/DOCX/TXT)' })
  async reviewPecaFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Arquivo não enviado');

    let text: string;
    const ext = file.originalname.toLowerCase();

    if (ext.endsWith('.pdf')) {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } else if (ext.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (ext.endsWith('.txt')) {
      text = file.buffer.toString('utf-8');
    } else {
      throw new Error('Formato não suportado. Use PDF, DOCX ou TXT.');
    }

    const prompt = `Você é um revisor jurídico especialista. Analise a peça processual abaixo e identifique: 1) Inconsistências jurídicas, 2) Erros de fundamentação, 3) Lacunas argumentativas, 4) Sugestões de melhoria. Seja específico e cite trechos.\n\nPeça:\n${text.slice(0, 12000)}`;
    const result = await this.aiProvider.generateChatCompletion([{ role: 'user', content: prompt }], { temperature: 0.3 });
    return { review: result.content, extractedLength: text.length };
  }

  @Post('minuta')
  @ApiOperation({ summary: 'Gerar minuta processual via IA' })
  async generateMinuta(@Body() body: { template: string; fields: Record<string, string> }) {
    const fieldsText = Object.entries(body.fields)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const prompt = `Você é um advogado experiente. Gere uma ${body.template} profissional e completa com base nos seguintes dados:\n\n${fieldsText}\n\nGere o documento com formatação jurídica adequada, incluindo preâmbulo, desenvolvimento e conclusão. Seja específico e profissional.`;
    const result = await this.aiProvider.generateChatCompletion([{ role: 'user', content: prompt }], { temperature: 0.4, maxTokens: 3000 });
    return { minuta: result.content };
  }

  @Post('compare')
  @ApiOperation({ summary: 'Comparar decisões judiciais via IA' })
  async compareDecisions(@Body() body: { documentIds: string[]; perspective?: string }) {
    const docs = await this.prisma.jurisprudenceDocument.findMany({
      where: { id: { in: body.documentIds } },
      include: {
        chunks: { take: 3, orderBy: { chunkIndex: 'asc' }, select: { content: true } },
      },
    });

    const docsText = docs.map((d, i) =>
      `Decisão ${i + 1}: ${d.title}\n${d.chunks.map((c: any) => c.content).join('\n').slice(0, 3000)}`
    ).join('\n\n---\n\n');

    const perspective = body.perspective || 'réu';
    const prompt = `Compare as seguintes decisões judiciais e aponte: 1) Pontos em comum, 2) Divergências principais, 3) Tendência jurisprudencial, 4) Qual decisão é mais favorável para [${perspective}] e por quê.\n\nDecisões:\n${docsText}`;
    const result = await this.aiProvider.generateChatCompletion([{ role: 'user', content: prompt }], { temperature: 0.3 });
    return { comparison: result.content, documents: docs.map((d) => ({ id: d.id, title: d.title, tribunal: d.tribunal })) };
  }
}
