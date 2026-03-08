import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import { IFileProcessor, FileProcessorResult } from './file-processor.interface';

@Injectable()
export class PdfProcessor implements IFileProcessor {
  private readonly logger = new Logger(PdfProcessor.name);

  async process(buffer: Buffer): Promise<FileProcessorResult> {
    this.logger.debug(`Processando PDF (${buffer.length} bytes)`);

    try {
      const data = await pdfParse(buffer);
      const text = this.cleanPdfText(data.text);
      return {
        text,
        pageCount: data.numpages,
        metadata: { info: data.info, version: data.version },
      };
    } catch (err) {
      this.logger.warn(`pdf-parse falhou (${(err as Error).message}), retornando texto vazio`);
      return { text: '', pageCount: 0, metadata: {} };
    }
  }

  private cleanPdfText(text: string): string {
    return text
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/(\r\n|\r)/g, '\n')
      .replace(/\f/g, '\n\n') // Form feeds como quebra de seção
      .replace(/[ \t]{3,}/g, '  ')
      .replace(/\n{5,}/g, '\n\n\n')
      .trim();
  }
}
