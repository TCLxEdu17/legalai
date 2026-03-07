import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TextChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  tokenEstimate: number;
}

/**
 * Serviço responsável por dividir documentos em chunks semânticos.
 * Estratégia: chunking por parágrafos com janela deslizante de overlap.
 * Preparado para estratégias mais sofisticadas no futuro (semântico, hierárquico).
 */
@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = configService.get<number>('app.rag.chunkSize', 1000);
    this.chunkOverlap = configService.get<number>('app.rag.chunkOverlap', 200);
  }

  /**
   * Divide o texto em chunks com overlap.
   * Respeita quebras de parágrafo para manter coerência semântica.
   */
  chunkText(text: string, documentMetadata?: Record<string, any>): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanText = this.cleanText(text);
    const paragraphs = this.splitIntoParagraphs(cleanText);
    const chunks: TextChunk[] = [];

    let currentChunk = '';
    let currentStartChar = 0;
    let charPosition = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphWithNewline = paragraph + '\n\n';

      // Se o parágrafo sozinho já excede o limite, divide em sentenças
      if (paragraph.length > this.chunkSize) {
        if (currentChunk.trim()) {
          chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, currentStartChar));
          currentChunk = '';
        }

        const sentences = this.splitIntoSentences(paragraph);
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > this.chunkSize && currentChunk.trim()) {
            chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, currentStartChar));

            // Overlap: pegar as últimas palavras do chunk anterior
            const overlap = this.getOverlapText(currentChunk, this.chunkOverlap);
            currentChunk = overlap + sentence + ' ';
            currentStartChar = charPosition - overlap.length;
          } else {
            currentChunk += sentence + ' ';
          }
          charPosition += sentence.length + 1;
        }
      } else if ((currentChunk + paragraphWithNewline).length > this.chunkSize) {
        // Parágrafo não cabe no chunk atual: finalizar e iniciar novo
        if (currentChunk.trim()) {
          chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, currentStartChar));

          const overlap = this.getOverlapText(currentChunk, this.chunkOverlap);
          currentChunk = overlap + paragraphWithNewline;
          currentStartChar = charPosition - overlap.length;
        } else {
          currentChunk = paragraphWithNewline;
          currentStartChar = charPosition;
        }
      } else {
        currentChunk += paragraphWithNewline;
      }

      charPosition += paragraphWithNewline.length;
    }

    // Último chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, currentStartChar));
    }

    this.logger.debug(`Documento dividido em ${chunks.length} chunks (tamanho alvo: ${this.chunkSize} chars)`);

    return chunks;
  }

  private createChunk(content: string, index: number, startChar: number): TextChunk {
    return {
      content,
      index,
      startChar,
      endChar: startChar + content.length,
      tokenEstimate: Math.ceil(content.length / 4), // ~4 chars por token
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ ]{3,}/g, '  ')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  private splitIntoSentences(text: string): string[] {
    // Divide em sentenças respeitando abreviações jurídicas comuns
    return text
      .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÀÃÕ])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;

    const overlapText = text.slice(-overlapSize);
    // Não quebrar no meio de uma palavra
    const firstSpace = overlapText.indexOf(' ');
    if (firstSpace > 0 && firstSpace < overlapSize / 2) {
      return overlapText.slice(firstSpace + 1) + ' ';
    }
    return overlapText + ' ';
  }
}
