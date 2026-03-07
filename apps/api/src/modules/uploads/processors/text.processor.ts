import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { IFileProcessor, FileProcessorResult } from './file-processor.interface';

@Injectable()
export class TextProcessor implements IFileProcessor {
  private readonly logger = new Logger(TextProcessor.name);

  async process(filePath: string): Promise<FileProcessorResult> {
    this.logger.debug(`Processando TXT: ${filePath}`);

    const content = await fs.readFile(filePath, 'utf-8');

    return {
      text: content.trim(),
    };
  }
}
