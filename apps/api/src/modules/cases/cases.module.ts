import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { RagModule } from '../rag/rag.module';
import { PdfProcessor } from '../uploads/processors/pdf.processor';
import { DocxProcessor } from '../uploads/processors/docx.processor';
import { TextProcessor } from '../uploads/processors/text.processor';

@Module({
  imports: [
    RagModule,
    MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } }),
  ],
  controllers: [CasesController],
  providers: [CasesService, PdfProcessor, DocxProcessor, TextProcessor],
  exports: [CasesService],
})
export class CasesModule {}
