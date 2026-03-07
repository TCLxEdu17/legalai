import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { PdfProcessor } from './processors/pdf.processor';
import { DocxProcessor } from './processors/docx.processor';
import { TextProcessor } from './processors/text.processor';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [UploadsController],
  providers: [UploadsService, PdfProcessor, DocxProcessor, TextProcessor],
  exports: [UploadsService],
})
export class UploadsModule {}
