import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkingService } from '../rag/chunking.service';
import { EmbeddingsService } from '../rag/embeddings.service';
import { RagService } from '../rag/rag.service';
import { PdfProcessor } from './processors/pdf.processor';
import { DocxProcessor } from './processors/docx.processor';
import { TextProcessor } from './processors/text.processor';
import { ProcessingStatus, UploadStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';

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
  private readonly uploadDir: string;
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly ragService: RagService,
    private readonly pdfProcessor: PdfProcessor,
    private readonly docxProcessor: DocxProcessor,
    private readonly textProcessor: TextProcessor,
  ) {
    this.uploadDir = configService.get<string>('app.upload.dir', './uploads');
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
      await this.cleanupFile(file.path);
      throw new BadRequestException('Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.');
    }

    // Criar registro no banco com status PENDING
    const document = await this.prisma.jurisprudenceDocument.create({
      data: {
        title: dto.title.trim(),
        fileName: file.originalname,
        fileType,
        filePath: file.path,
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

    // Processar de forma assíncrona (não bloquear a resposta HTTP)
    // Em produção, isso seria delegado para uma fila (BullMQ/Redis)
    this.processDocumentAsync(document.id, file, dto).catch((err) => {
      this.logger.error(`Falha no processamento do documento ${document.id}:`, err.stack);
    });

    return {
      id: document.id,
      title: document.title,
      status: 'PROCESSING',
      message: 'Documento recebido e em processamento. Acompanhe o status na listagem.',
    };
  }

  /**
   * Pipeline completo de processamento:
   * 1. Extração de texto
   * 2. Limpeza e normalização
   * 3. Geração de chunks
   * 4. Geração de embeddings
   * 5. Indexação no banco vetorial
   */
  private async processDocumentAsync(
    documentId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<void> {
    try {
      // Etapa 1: Extração de texto
      await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.CHUNKING);

      const processor = this.getProcessor(file.mimetype, file.originalname);
      const extracted = await processor.process(file.path);

      const extractedText = extracted.text?.trim() || '';

      // Etapa 2: Auto-extração de metadados se solicitado e houver texto
      let metadata: Partial<typeof dto> = {};
      if (dto.autoExtractMetadata && extractedText.length > 0) {
        this.logger.debug(`Extraindo metadados automaticamente para ${documentId}`);
        const extracted_meta = await this.ragService.extractMetadata(extractedText);
        metadata = {
          tribunal: extracted_meta.tribunal || dto.tribunal,
          processNumber: extracted_meta.processNumber || dto.processNumber,
          relator: extracted_meta.relator || dto.relator,
          judgmentDate: extracted_meta.judgmentDate || dto.judgmentDate,
          theme: extracted_meta.theme || dto.theme,
          keywords: extracted_meta.keywords.length > 0 ? extracted_meta.keywords : dto.keywords,
        };
      }

      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: {
          originalText: extractedText || null,
          cleanedText: extractedText || null,
          ...metadata,
        },
      });

      // Etapa 3: Geração de chunks (somente se houver texto extraído)
      const chunks = extractedText.length > 0
        ? this.chunkingService.chunkText(extractedText)
        : [];

      this.logger.log(`${chunks.length} chunks gerados para ${documentId}`);

      // Etapa 4 & 5: Embeddings + Indexação (somente se houver chunks)
      if (chunks.length > 0) {
        await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.EMBEDDING);
        await this.embeddingsService.generateAndStoreEmbeddings(
          documentId,
          chunks,
          this.embeddingModel,
        );
      }

      // Sucesso: atualizar status final
      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: {
          uploadStatus: UploadStatus.COMPLETED,
          processingStatus: ProcessingStatus.INDEXED,
          chunkCount: chunks.length,
        },
      });

      this.logger.log(`Documento ${documentId} indexado com sucesso (${chunks.length} chunks)`);
    } catch (error) {
      this.logger.error(`Erro no processamento do documento ${documentId}:`, error.message);

      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: {
          uploadStatus: UploadStatus.FAILED,
          processingStatus: ProcessingStatus.FAILED,
          processingError: error.message,
        },
      });
    }
  }

  async reindex(documentId: string): Promise<void> {
    const document = await this.prisma.jurisprudenceDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Documento ${documentId} não encontrado`);
    }

    this.logger.log(`Reindexando documento: ${documentId}`);

    await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.CHUNKING);

    const chunks = document.cleanedText
      ? this.chunkingService.chunkText(document.cleanedText)
      : [];

    if (chunks.length > 0) {
      await this.updateStatus(documentId, UploadStatus.PROCESSING, ProcessingStatus.EMBEDDING);
      await this.embeddingsService.generateAndStoreEmbeddings(documentId, chunks, this.embeddingModel);
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

  private async cleanupFile(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch {}
  }
}
