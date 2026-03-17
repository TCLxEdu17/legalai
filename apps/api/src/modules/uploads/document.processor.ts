import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkingService } from '../rag/chunking.service';
import { EmbeddingsService } from '../rag/embeddings.service';
import { RagService } from '../rag/rag.service';
import { StorageService } from '../storage/storage.service';
import { PdfProcessor } from './processors/pdf.processor';
import { DocxProcessor } from './processors/docx.processor';
import { TextProcessor } from './processors/text.processor';
import { ProcessingStatus, UploadStatus } from '@prisma/client';
import * as path from 'path';
import { DOCUMENT_PROCESSING_QUEUE, DocumentJob } from '../queue/queues.constants';
import { UploadDocumentDto } from './uploads.service';

export interface ProcessDocumentJobData {
  documentId: string;
  buffer: number[]; // Buffer serializado como array para o BullMQ (JSON)
  mimetype: string;
  originalname: string;
  dto: UploadDocumentDto;
}

export interface ReindexDocumentJobData {
  documentId: string;
}

@Processor(DOCUMENT_PROCESSING_QUEUE, { concurrency: 3 })
export class DocumentQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentQueueProcessor.name);
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly chunking: ChunkingService,
    private readonly embeddings: EmbeddingsService,
    private readonly ragService: RagService,
    private readonly storage: StorageService,
    private readonly pdfProcessor: PdfProcessor,
    private readonly docxProcessor: DocxProcessor,
    private readonly textProcessor: TextProcessor,
  ) {
    super();
    this.embeddingModel = config.get<string>('app.ai.openai.embeddingModel', 'text-embedding-3-small');
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case DocumentJob.PROCESS:
        return this.processDocument(job as Job<ProcessDocumentJobData>);
      case DocumentJob.REINDEX:
        return this.reindexDocument(job as Job<ReindexDocumentJobData>);
      default:
        this.logger.warn(`Job desconhecido: ${job.name}`);
    }
  }

  private async processDocument(job: Job<ProcessDocumentJobData>): Promise<void> {
    const { documentId, buffer: bufferArray, mimetype, originalname, dto } = job.data;
    const buffer = Buffer.from(bufferArray);

    this.logger.log(`[Queue] Processando documento ${documentId} (tentativa ${job.attemptsMade + 1})`);

    try {
      await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.CHUNKING);
      await job.updateProgress(10);

      // 1. Storage
      const storageKey = `documents/${documentId}/${originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = await this.storage.uploadFile(buffer, storageKey, mimetype);
      await this.prisma.jurisprudenceDocument.update({ where: { id: documentId }, data: { filePath } });
      await job.updateProgress(25);

      // 2. Extração de texto
      const processor = this.getProcessor(mimetype, originalname);
      const { text: extractedText = '' } = await processor.process(buffer);
      const cleanText = extractedText.trim();

      // 3. Metadados automáticos
      let metadata: Partial<UploadDocumentDto> = {};
      if (dto.autoExtractMetadata && cleanText.length > 0) {
        const extracted = await this.ragService.extractMetadata(cleanText);
        metadata = {
          tribunal: extracted.tribunal || dto.tribunal,
          processNumber: extracted.processNumber || dto.processNumber,
          relator: extracted.relator || dto.relator,
          judgmentDate: extracted.judgmentDate || dto.judgmentDate,
          theme: extracted.theme || dto.theme,
          keywords: extracted.keywords.length > 0 ? extracted.keywords : dto.keywords,
        };
      }

      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: { originalText: cleanText || null, cleanedText: cleanText || null, ...metadata },
      });
      await job.updateProgress(40);

      // 4. Chunks
      const chunks = cleanText.length > 0 ? this.chunking.chunkText(cleanText) : [];
      this.logger.log(`[Queue] ${chunks.length} chunks para ${documentId}`);

      // 5. Embeddings
      if (chunks.length > 0) {
        await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.EMBEDDING);
        await job.updateProgress(60);
        await this.embeddings.generateAndStoreEmbeddings(documentId, chunks, this.embeddingModel);
      }

      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: {
          uploadStatus: UploadStatus.COMPLETED,
          processingStatus: ProcessingStatus.INDEXED,
          chunkCount: chunks.length,
          processingError: null,
        },
      });

      await job.updateProgress(100);
      this.logger.log(`[Queue] Documento ${documentId} indexado (${chunks.length} chunks)`);
    } catch (error) {
      this.logger.error(`[Queue] Falha no documento ${documentId}: ${error.message}`);

      // Só marca como FAILED na última tentativa
      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await this.prisma.jurisprudenceDocument.update({
          where: { id: documentId },
          data: {
            uploadStatus: UploadStatus.FAILED,
            processingStatus: ProcessingStatus.FAILED,
            processingError: error.message,
          },
        });
      }

      throw error; // BullMQ faz retry automaticamente
    }
  }

  private async reindexDocument(job: Job<ReindexDocumentJobData>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`[Queue] Reindexando ${documentId}`);

    const document = await this.prisma.jurisprudenceDocument.findUnique({ where: { id: documentId } });
    if (!document) return;

    await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.CHUNKING);
    const chunks = document.cleanedText ? this.chunking.chunkText(document.cleanedText) : [];

    if (chunks.length > 0) {
      await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.EMBEDDING);
      await this.embeddings.generateAndStoreEmbeddings(documentId, chunks, this.embeddingModel);
    }

    await this.prisma.jurisprudenceDocument.update({
      where: { id: documentId },
      data: { uploadStatus: UploadStatus.COMPLETED, processingStatus: ProcessingStatus.INDEXED, chunkCount: chunks.length, processingError: null },
    });
  }

  private async updateStatus(id: string, uploadStatus: UploadStatus, processingStatus: ProcessingStatus) {
    await this.prisma.jurisprudenceDocument.update({ where: { id }, data: { uploadStatus, processingStatus } });
  }

  private getProcessor(mimetype: string, filename: string) {
    const ext = path.extname(filename).toLowerCase();
    if (mimetype === 'application/pdf' || ext === '.pdf') return this.pdfProcessor;
    if (mimetype.includes('wordprocessingml') || ext === '.docx') return this.docxProcessor;
    return this.textProcessor;
  }
}
