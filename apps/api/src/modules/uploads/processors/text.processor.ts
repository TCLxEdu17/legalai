import { Injectable, Logger } from '@nestjs/common';
import { IFileProcessor, FileProcessorResult } from './file-processor.interface';

@Injectable()
export class TextProcessor implements IFileProcessor {
  private readonly logger = new Logger(TextProcessor.name);

  async process(buffer: Buffer): Promise<FileProcessorResult> {
    this.logger.debug(`Processando TXT (${buffer.length} bytes)`);

    return {
      text: buffer.toString('utf-8').trim(),
    };
  }
}
