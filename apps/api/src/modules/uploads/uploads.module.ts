import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { DocumentQueueProcessor } from './document.processor';
import { PdfProcessor } from './processors/pdf.processor';
import { DocxProcessor } from './processors/docx.processor';
import { TextProcessor } from './processors/text.processor';
import { RagModule } from '../rag/rag.module';
import { DOCUMENT_PROCESSING_QUEUE } from '../queue/queues.constants';

@Module({
  imports: [
    RagModule,
    BullModule.registerQueue({ name: DOCUMENT_PROCESSING_QUEUE }),
  ],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    DocumentQueueProcessor,
    PdfProcessor,
    DocxProcessor,
    TextProcessor,
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
