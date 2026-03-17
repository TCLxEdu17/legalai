import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export interface DecryptedCredentials {
  oabNumber: string;
  password: string;
}

@Injectable()
export class OabCredentialsService {
  private readonly logger = new Logger(OabCredentialsService.name);
  private readonly key: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const hexKey = this.config.get<string>('OAB_ENCRYPTION_KEY', '');
    if (!hexKey || hexKey.length < 64) {
      this.logger.warn('OAB_ENCRYPTION_KEY ausente ou muito curta — use 32 bytes hex (64 chars)');
    }
    this.key = Buffer.from(hexKey.padEnd(64, '0').slice(0, 64), 'hex');
  }

  async saveCredentials(userId: string, oabNumber: string, password: string): Promise<void> {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    await this.prisma.oabCredential.upsert({
      where: { userId },
      create: {
        userId,
        oabNumber,
        encryptedPwd: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      },
      update: {
        oabNumber,
        encryptedPwd: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      },
    });

    this.logger.log(`[OAB] Credenciais salvas para userId=${userId}`);
  }

  async getDecryptedCredentials(userId: string): Promise<DecryptedCredentials | null> {
    const record = await this.prisma.oabCredential.findUnique({ where: { userId } });
    if (!record) return null;

    const iv = Buffer.from(record.iv, 'base64');
    const encryptedPwd = Buffer.from(record.encryptedPwd, 'base64');
    const authTag = Buffer.from(record.authTag, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedPwd), decipher.final()]);

    return {
      oabNumber: record.oabNumber,
      password: decrypted.toString('utf8'),
    };
  }

  async deleteCredentials(userId: string): Promise<void> {
    await this.prisma.oabCredential.delete({ where: { userId } });
    this.logger.log(`[OAB] Credenciais removidas para userId=${userId}`);
  }

  async hasCredentials(userId: string): Promise<boolean> {
    const record = await this.prisma.oabCredential.findUnique({
      where: { userId },
      select: { id: true },
    });
    return record !== null;
  }
}
