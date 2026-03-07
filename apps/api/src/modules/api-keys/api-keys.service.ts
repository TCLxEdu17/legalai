import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gera uma nova API Key. O valor raw é retornado apenas uma vez.
   * Somente o hash é armazenado no banco.
   */
  async create(dto: CreateApiKeyDto, userId: string) {
    const rawKey = `lk_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 10);
    const keyHash = await argon2.hash(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        keyHash,
        keyPrefix,
        userId,
      },
    });

    this.logger.log(`API Key criada: "${dto.name}" para usuário ${userId}`);

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      key: rawKey, // Retornado apenas aqui, nunca mais
      createdAt: apiKey.createdAt,
      message: 'Guarde esta chave com segurança. Ela não será exibida novamente.',
    };
  }

  async findAll(userId: string, userRole: string) {
    const where = userRole === 'ADMIN' ? {} : { userId };

    return this.prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, userId: string, userRole: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException(`API Key ${id} não encontrada`);

    if (key.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Sem permissão para revogar esta chave');
    }

    await this.prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    this.logger.log(`API Key ${id} revogada`);
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException(`API Key ${id} não encontrada`);

    if (key.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Sem permissão para deletar esta chave');
    }

    await this.prisma.apiKey.delete({ where: { id } });
    this.logger.log(`API Key ${id} deletada`);
  }

  /**
   * Valida uma API Key recebida em uma requisição.
   * Atualiza lastUsedAt quando válida.
   */
  async validate(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
    if (!rawKey.startsWith('lk_')) return null;

    const allActive = await this.prisma.apiKey.findMany({
      where: { isActive: true },
      select: { id: true, keyHash: true, userId: true, keyPrefix: true },
    });

    // Filtrar pelo prefixo primeiro (otimização)
    const prefix = rawKey.slice(0, 10);
    const candidates = allActive.filter((k: typeof allActive[0]) => k.keyPrefix === prefix);

    for (const candidate of candidates) {
      const valid = await argon2.verify(candidate.keyHash, rawKey);
      if (valid) {
        // Atualizar lastUsedAt em background
        this.prisma.apiKey
          .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
          .catch(() => {});

        return { userId: candidate.userId, keyId: candidate.id };
      }
    }

    return null;
  }
}
