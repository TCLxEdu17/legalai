import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string | null = null;
  private readonly publicUrl: string | null = null;
  private readonly isConfigured: boolean = false;
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    this.uploadDir = this.configService.get<string>('app.upload.dir', './uploads');

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.bucketName = bucketName;
      this.publicUrl = publicUrl || null;
      this.isConfigured = true;
      this.logger.log(`StorageService: Cloudflare R2 configurado (bucket: ${bucketName})`);
    } else {
      this.logger.warn(
        'StorageService: R2 não configurado (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME ausentes). ' +
        'Usando armazenamento local em disco como fallback.',
      );
    }
  }

  /**
   * Upload de arquivo para R2 (ou disco local como fallback).
   * @returns URL pública do arquivo (R2) ou caminho local relativo ao disco.
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimetype: string,
  ): Promise<string> {
    if (this.isConfigured && this.s3Client && this.bucketName) {
      return this.uploadToR2(buffer, key, mimetype);
    }
    return this.uploadToLocalDisk(buffer, key);
  }

  /**
   * Remove arquivo do R2 (ou disco local como fallback).
   * Aceita tanto chaves R2 quanto caminhos locais.
   */
  async deleteFile(keyOrPath: string): Promise<void> {
    if (this.isConfigured && this.s3Client && this.bucketName) {
      // Se for uma URL pública, extrair a key
      const key = this.extractKeyFromUrl(keyOrPath);
      await this.deleteFromR2(key);
    } else {
      await this.deleteFromLocalDisk(keyOrPath);
    }
  }

  /**
   * Gera URL assinada para acesso temporário a arquivos privados.
   * Apenas disponível quando R2 está configurado.
   */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.isConfigured || !this.s3Client || !this.bucketName) {
      throw new Error('R2 não configurado — não é possível gerar URL assinada.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  get configured(): boolean {
    return this.isConfigured;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private async uploadToR2(
    buffer: Buffer,
    key: string,
    mimetype: string,
  ): Promise<string> {
    this.logger.debug(`Uploading to R2: ${key} (${buffer.length} bytes)`);

    const upload = new Upload({
      client: this.s3Client!,
      params: {
        Bucket: this.bucketName!,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      },
    });

    await upload.done();

    const url = this.publicUrl
      ? `${this.publicUrl.replace(/\/$/, '')}/${key}`
      : `https://${this.bucketName}.r2.cloudflarestorage.com/${key}`;

    this.logger.log(`Arquivo enviado para R2: ${url}`);
    return url;
  }

  private async uploadToLocalDisk(buffer: Buffer, key: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    this.logger.log(`Arquivo salvo localmente: ${filePath}`);
    return filePath;
  }

  private async deleteFromR2(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      });
      await this.s3Client!.send(command);
      this.logger.log(`Arquivo removido do R2: ${key}`);
    } catch (err: any) {
      this.logger.warn(`Falha ao remover arquivo do R2 (${key}): ${err.message}`);
    }
  }

  private async deleteFromLocalDisk(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`Arquivo local removido: ${filePath}`);
    } catch (err: any) {
      this.logger.warn(`Arquivo local não encontrado: ${filePath}`);
    }
  }

  /**
   * Se keyOrPath for uma URL pública R2, extrai apenas a key.
   * Caso contrário, retorna o valor original.
   */
  private extractKeyFromUrl(keyOrPath: string): string {
    if (this.publicUrl && keyOrPath.startsWith(this.publicUrl)) {
      return keyOrPath.slice(this.publicUrl.replace(/\/$/, '').length + 1);
    }
    // Tenta remover o endpoint R2 genérico
    const r2Pattern = /https?:\/\/[^/]+\.r2(?:\.cloudflarestorage)?\.com\//;
    const match = keyOrPath.match(r2Pattern);
    if (match) {
      return keyOrPath.slice(match[0].length);
    }
    return keyOrPath;
  }
}
