import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
import { ProcessDocumentJobData } from './document.processor';

export interface UploadDocumentDto {
  title: string;
  tribunal?: string;
  processNumber?: string;
  relator?: string;
  judgmentDate?: string;
  theme?: string;
  keywords?: string[];
  autoExtractMetadata?: boolean;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly ragService: RagService,
    private readonly storageService: StorageService,
    private readonly pdfProcessor: PdfProcessor,
    private readonly docxProcessor: DocxProcessor,
    private readonly textProcessor: TextProcessor,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE) private readonly docQueue: Queue,
  ) {
    this.embeddingModel = configService.get<string>(
      'app.ai.openai.embeddingModel',
      'text-embedding-3-small',
    );
  }

  async processUpload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    userId: string,
  ) {
    this.logger.log(`Iniciando upload: ${file.originalname} por usuário ${userId}`);

    const fileType = this.getFileType(file.mimetype, file.originalname);
    if (!fileType) {
      throw new BadRequestException('Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.');
    }

    // Criar registro no banco com status PROCESSING
    const document = await this.prisma.jurisprudenceDocument.create({
      data: {
        title: dto.title.trim(),
        fileName: file.originalname,
        fileType,
        filePath: '',
        fileSize: file.size,
        tribunal: dto.tribunal?.trim() || null,
        processNumber: dto.processNumber?.trim() || null,
        relator: dto.relator?.trim() || null,
        judgmentDate: dto.judgmentDate ? new Date(dto.judgmentDate) : null,
        theme: dto.theme?.trim() || null,
        keywords: dto.keywords || [],
        uploadStatus: UploadStatus.PROCESSING,
        processingStatus: ProcessingStatus.NOT_STARTED,
        createdById: userId,
      },
    });

    // Enfileirar processamento (BullMQ) — retry automático, concorrência controlada
    const jobData: ProcessDocumentJobData = {
      documentId: document.id,
      buffer: Array.from(file.buffer), // Buffer → array para serialização JSON
      mimetype: file.mimetype,
      originalname: file.originalname,
      dto,
    };
    await this.docQueue.add(DocumentJob.PROCESS, jobData, { priority: 1 });

    return {
      id: document.id,
      title: document.title,
      status: 'PROCESSING',
      message: 'Documento recebido e em processamento. Acompanhe o status na listagem.',
    };
  }

  async reindex(documentId: string): Promise<void> {
    const document = await this.prisma.jurisprudenceDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Documento ${documentId} não encontrado`);
    }

    this.logger.log(`Enfileirando reindexação: ${documentId}`);
    await this.docQueue.add(DocumentJob.REINDEX, { documentId }, { priority: 2 });
  }

  private async updateStatus(
    id: string,
    uploadStatus: UploadStatus,
    processingStatus: ProcessingStatus,
  ) {
    await this.prisma.jurisprudenceDocument.update({
      where: { id },
      data: { uploadStatus, processingStatus },
    });
  }

  private getFileType(mimetype: string, filename: string): string | null {
    const ext = path.extname(filename).toLowerCase();
    if (mimetype === 'application/pdf' || ext === '.pdf') return 'pdf';
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    )
      return 'docx';
    if (mimetype === 'text/plain' || ext === '.txt') return 'txt';
    return null;
  }

  private getProcessor(mimetype: string, filename: string) {
    const fileType = this.getFileType(mimetype, filename);
    if (fileType === 'pdf') return this.pdfProcessor;
    if (fileType === 'docx') return this.docxProcessor;
    return this.textProcessor;
  }

  async analyzeDocument(file: Express.Multer.File): Promise<any> {
    this.logger.log(`Analisando documento: ${file.originalname} (${file.size} bytes)`);

    const fileType = this.getFileType(file.mimetype, file.originalname);
    if (!fileType) {
      throw new BadRequestException('Tipo de arquivo não suportado. Use PDF ou DOCX.');
    }

    const processor = this.getProcessor(file.mimetype, file.originalname);
    const extracted = await processor.process(file.buffer);
    const text = extracted.text?.trim() || '';

    if (text.length < 50) {
      throw new BadRequestException('Não foi possível extrair texto suficiente do documento.');
    }

    this.logger.log(`Texto extraído: ${text.length} caracteres. Enviando para análise IA.`);
    return this.ragService.analyzeDocument(text);
  }
}
