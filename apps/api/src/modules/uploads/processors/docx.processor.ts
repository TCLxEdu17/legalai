import { Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { IFileProcessor, FileProcessorResult } from './file-processor.interface';

@Injectable()
export class DocxProcessor implements IFileProcessor {
  private readonly logger = new Logger(DocxProcessor.name);

  async process(buffer: Buffer): Promise<FileProcessorResult> {
    this.logger.debug(`Processando DOCX (${buffer.length} bytes)`);

    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      this.logger.warn(`Avisos ao processar DOCX: ${result.messages.map((m) => m.message).join('; ')}`);
    }

    return {
      text: this.cleanDocxText(result.value),
      metadata: {
        warnings: result.messages.map((m) => m.message),
      },
    };
  }

  private cleanDocxText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ ]{3,}/g, '  ')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }
}
