# Radar de Jurisprudência em Tempo Real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um módulo de Radar que monitora novas jurisprudências ingeridas, cruza com teses cadastradas pelo usuário via pgvector, e envia alertas in-app + email.

**Architecture:** Hook pós-ingestão: após `IngestionService` indexar um documento, `RadarsService.checkDocument()` é chamado com `@Optional()` (fire-and-forget). O check usa pgvector para comparar o embedding da tese do radar contra os chunks do documento. Alertas são salvos em `radar_alerts` e o usuário é notificado via `NotificationsService` (in-app) e `RadarEmailService` (email).

**Tech Stack:** NestJS, Prisma, pgvector (`$executeRawUnsafe`), OpenAI Embeddings via `EmbeddingsService`, nodemailer, Next.js App Router, TanStack Query.

**Spec:** `docs/superpowers/specs/2026-03-23-radar-jurisprudencia-design.md`

---

## File Map

### Create (Backend)
- `apps/api/src/modules/radars/dto/create-radar.dto.ts`
- `apps/api/src/modules/radars/dto/update-radar.dto.ts`
- `apps/api/src/modules/radars/radars.service.ts`
- `apps/api/src/modules/radars/radars.service.spec.ts`
- `apps/api/src/modules/radars/radars.controller.ts`
- `apps/api/src/modules/radars/radar-alerts.controller.ts`
- `apps/api/src/modules/radars/radar-email.service.ts`
- `apps/api/src/modules/radars/radars.module.ts`

### Modify (Backend)
- `apps/api/prisma/schema.prisma` — add `Radar`, `RadarAlert`, update `User`, `Case`, `JurisprudenceDocument`
- `apps/api/src/modules/ingestion/ingestion.service.ts` — inject `RadarsService` with `@Optional()`, add hook
- `apps/api/src/modules/ingestion/ingestion.module.ts` — import `RadarsModule`
- `apps/api/src/app.module.ts` — import `RadarsModule`

### Create (Frontend)
- `apps/web/src/app/dashboard/radares/page.tsx`
- `apps/web/src/app/dashboard/radares/[id]/page.tsx`

### Modify (Frontend)
- `apps/web/src/lib/api-client.ts` — add radar/alert API methods
- `apps/web/src/components/layout/sidebar.tsx` — add "Radar" nav item in "IA & Casos"
- `apps/web/src/components/layout/header.tsx` — add radar unread count badge
- `apps/web/src/app/dashboard/casos/[id]/page.tsx` — add "Radares vinculados" section

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Adicionar modelos Radar e RadarAlert ao schema.prisma**

Abra `apps/api/prisma/schema.prisma` e adicione logo após o modelo `Case` (buscar por `@@map("cases")`):

```prisma
model Radar {
  id         String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  caseId     String?  @map("case_id") @db.Uuid
  title      String
  thesisText String   @map("thesis_text") @db.Text
  // thesis_embedding vector(1536) — adicionado via raw SQL após migration
  threshold  Float    @default(0.8)
  active     Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  user   User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  case   Case?      @relation(fields: [caseId], references: [id], onDelete: SetNull)
  alerts RadarAlert[]

  @@index([userId])
  @@index([active])
  @@map("radars")
}

model RadarAlert {
  id               String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  radarId          String    @map("radar_id") @db.Uuid
  documentId       String    @map("document_id") @db.Uuid
  similarity       Float
  summary          String?   @db.Text
  impactAnalysis   String?   @map("impact_analysis") @db.Text
  notifiedByEmail  Boolean   @default(false) @map("notified_by_email")
  readAt           DateTime? @map("read_at")
  createdAt        DateTime  @default(now()) @map("created_at")

  radar    Radar                 @relation(fields: [radarId], references: [id], onDelete: Cascade)
  document JurisprudenceDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([radarId, documentId])
  @@index([radarId])
  @@index([readAt])
  @@map("radar_alerts")
}
```

- [ ] **Step 2: Adicionar relações nos modelos existentes**

No modelo `User` (após `savedProcesses SavedProcess[]`), adicionar:
```prisma
  radars    Radar[]
```

No modelo `Case` (antes de `@@map("cases")`), adicionar:
```prisma
  radars    Radar[]
```

No modelo `JurisprudenceDocument` (após `comments DocumentComment[]`), adicionar:
```prisma
  radarAlerts RadarAlert[]
```

- [ ] **Step 3: Rodar migration**

```bash
cd apps/api
npx prisma migrate dev --name add_radars
```

Expected: migration criada e aplicada sem erros.

- [ ] **Step 4: Adicionar coluna thesis_embedding e HNSW index via raw SQL**

```bash
cd apps/api
npx prisma db execute --stdin <<'SQL'
ALTER TABLE radars ADD COLUMN IF NOT EXISTS thesis_embedding vector(1536);
CREATE INDEX IF NOT EXISTS radars_thesis_embedding_hnsw
  ON radars USING hnsw (thesis_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
SQL
```

- [ ] **Step 5: Regenerar o Prisma client**

```bash
cd apps/api
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(radars): migration — tabelas radars e radar_alerts com pgvector"
```

---

## Task 2: DTOs + Module Skeleton

**Files:**
- Create: `apps/api/src/modules/radars/dto/create-radar.dto.ts`
- Create: `apps/api/src/modules/radars/dto/update-radar.dto.ts`
- Create: `apps/api/src/modules/radars/radars.module.ts`

- [ ] **Step 1: Criar CreateRadarDto**

```typescript
// apps/api/src/modules/radars/dto/create-radar.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max, MaxLength } from 'class-validator';

export class CreateRadarDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  thesisText: string;

  @IsOptional()
  @IsNumber()
  @Min(0.6)
  @Max(1.0)
  threshold?: number;

  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
```

- [ ] **Step 2: Criar UpdateRadarDto**

```typescript
// apps/api/src/modules/radars/dto/update-radar.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRadarDto } from './create-radar.dto';

export class UpdateRadarDto extends PartialType(CreateRadarDto) {}
```

- [ ] **Step 3: Criar RadarsModule placeholder**

```typescript
// apps/api/src/modules/radars/radars.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, RagModule, NotificationsModule],
  providers: [],
  controllers: [],
  exports: [],
})
export class RadarsModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/radars/
git commit -m "feat(radars): DTOs e módulo skeleton"
```

---

## Task 3: RadarsService — CRUD

**Files:**
- Create: `apps/api/src/modules/radars/radars.service.ts`
- Create: `apps/api/src/modules/radars/radars.service.spec.ts`

- [ ] **Step 1: Escrever o teste falhando**

```typescript
// apps/api/src/modules/radars/radars.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RadarsService } from './radars.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN } from '../rag/providers/ai-provider.interface';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  radar: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  radarAlert: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  jurisprudenceDocument: {
    findUnique: jest.fn(),
  },
  $executeRawUnsafe: jest.fn(),
  $queryRawUnsafe: jest.fn(),
};

const mockAIProvider = {
  generateEmbedding: jest.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1), tokenCount: 10 }),
  generateChatCompletion: jest.fn(),
};

const mockNotificationsService = {
  createForUser: jest.fn().mockResolvedValue(undefined),
};

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_RADAR_ID = 'radar-uuid-1';

describe('RadarsService', () => {
  let service: RadarsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RadarsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get(RadarsService);
  });

  describe('create', () => {
    it('deve criar radar e gerar embedding da tese', async () => {
      const dto = { title: 'Dano Moral', thesisText: 'negativação indevida', threshold: 0.85 };
      mockPrisma.radar.create.mockResolvedValue({ id: MOCK_RADAR_ID, ...dto });
      mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);

      const result = await service.create(dto, MOCK_USER_ID);

      expect(mockAIProvider.generateEmbedding).toHaveBeenCalledWith(dto.thesisText);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
      expect(result.id).toBe(MOCK_RADAR_ID);
    });
  });

  describe('list', () => {
    it('deve retornar radares do usuário', async () => {
      mockPrisma.radar.findMany.mockResolvedValue([{ id: MOCK_RADAR_ID }]);
      const result = await service.list(MOCK_USER_ID);
      expect(mockPrisma.radar.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: MOCK_USER_ID },
      }));
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('deve rejeitar se radar não pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: 'other-user' });
      await expect(service.update(MOCK_RADAR_ID, {}, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve regenerar embedding se thesisText mudou', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: MOCK_USER_ID });
      mockPrisma.radar.update.mockResolvedValue({ id: MOCK_RADAR_ID });
      mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);

      await service.update(MOCK_RADAR_ID, { thesisText: 'nova tese' }, MOCK_USER_ID);

      expect(mockAIProvider.generateEmbedding).toHaveBeenCalledWith('nova tese');
    });
  });

  describe('remove', () => {
    it('deve rejeitar se radar não pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: 'other-user' });
      await expect(service.remove(MOCK_RADAR_ID, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/api
npx jest src/modules/radars/radars.service.spec.ts --no-coverage
```

Expected: FAIL — `RadarsService` não existe ainda.

- [ ] **Step 3: Implementar RadarsService (CRUD)**

```typescript
// apps/api/src/modules/radars/radars.service.ts
import {
  Injectable, Logger, NotFoundException, ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN, IAIProvider } from '../rag/providers/ai-provider.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRadarDto } from './dto/create-radar.dto';
import { UpdateRadarDto } from './dto/update-radar.dto';

@Injectable()
export class RadarsService {
  private readonly logger = new Logger(RadarsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
    private readonly notificationsService: NotificationsService,
  ) {}

  // RadarEmailService é injetado no constructor (adicionado na Task 5):
  // constructor(..., private readonly radarEmailService: RadarEmailService) {}

  async create(dto: CreateRadarDto, userId: string) {
    const { embedding } = await this.aiProvider.generateEmbedding(dto.thesisText);

    const radar = await this.prisma.radar.create({
      data: {
        userId,
        title: dto.title,
        thesisText: dto.thesisText,
        threshold: dto.threshold ?? 0.8,
        caseId: dto.caseId ?? null,
        active: dto.active ?? true,
      },
    });

    const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE radars SET thesis_embedding = ${embeddingLiteral} WHERE id = '${radar.id}'::uuid`,
    );

    return radar;
  }

  async list(userId: string) {
    return this.prisma.radar.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        case: { select: { id: true, title: true } },
        _count: { select: { alerts: { where: { readAt: null } } } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const radar = await this.prisma.radar.findUnique({
      where: { id },
      include: { case: { select: { id: true, title: true } } },
    });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();
    return radar;
  }

  async update(id: string, dto: UpdateRadarDto, userId: string) {
    const radar = await this.prisma.radar.findUnique({ where: { id } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.radar.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.thesisText && { thesisText: dto.thesisText }),
        ...(dto.threshold !== undefined && { threshold: dto.threshold }),
        ...(dto.caseId !== undefined && { caseId: dto.caseId }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    if (dto.thesisText) {
      const { embedding } = await this.aiProvider.generateEmbedding(dto.thesisText);
      const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;
      await this.prisma.$executeRawUnsafe(
        `UPDATE radars SET thesis_embedding = ${embeddingLiteral} WHERE id = '${id}'::uuid`,
      );
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const radar = await this.prisma.radar.findUnique({ where: { id } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();
    await this.prisma.radar.delete({ where: { id } });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.prisma.radarAlert.count({
      where: { radar: { userId }, readAt: null },
    });
    return result;
  }
}
```

- [ ] **Step 4: Registrar no módulo**

Atualizar `apps/api/src/modules/radars/radars.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RadarsService } from './radars.service';

@Module({
  imports: [PrismaModule, RagModule, NotificationsModule],
  providers: [RadarsService],
  controllers: [],
  exports: [RadarsService],
})
export class RadarsModule {}
```

- [ ] **Step 5: Rodar testes e confirmar que passam**

```bash
cd apps/api
npx jest src/modules/radars/radars.service.spec.ts --no-coverage
```

Expected: PASS (todos os testes do describe CRUD).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/radars/
git commit -m "feat(radars): RadarsService CRUD com embedding de tese"
```

---

## Task 4: RadarsService — checkDocument

**Files:**
- Modify: `apps/api/src/modules/radars/radars.service.ts`
- Modify: `apps/api/src/modules/radars/radars.service.spec.ts`

- [ ] **Step 1: Adicionar testes para checkDocument**

Adicionar ao `describe` em `radars.service.spec.ts`:

```typescript
  describe('checkDocument', () => {
    const MOCK_DOC_ID = 'doc-uuid-1';

    it('não deve criar alerta se nenhum radar ativo', async () => {
      // Simula query pgvector retornando vazio (nenhum radar com similaridade suficiente)
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.checkDocument(MOCK_DOC_ID);

      expect(mockPrisma.radarAlert.create).not.toHaveBeenCalled();
    });

    it('deve criar alerta quando similaridade >= threshold', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          radar_id: MOCK_RADAR_ID,
          max_similarity: 0.91,
          user_id: MOCK_USER_ID,
          title: 'Dano Moral',
          threshold: 0.85,
        },
      ]);
      mockPrisma.radarAlert.create.mockResolvedValue({ id: 'alert-1', radarId: MOCK_RADAR_ID });
      mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Resumo da decisão',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });
      mockPrisma.radarAlert.update.mockResolvedValue({});

      await service.checkDocument(MOCK_DOC_ID);

      expect(mockPrisma.radarAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ radarId: MOCK_RADAR_ID, documentId: MOCK_DOC_ID }),
        }),
      );
      expect(mockNotificationsService.createForUser).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.stringContaining('Dano Moral'),
        expect.any(String),
        expect.stringContaining(MOCK_RADAR_ID),
      );
    });

    it('deve ignorar radar_alert duplicado (@@unique constraint)', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { radar_id: MOCK_RADAR_ID, max_similarity: 0.92, user_id: MOCK_USER_ID, title: 'Dano Moral', threshold: 0.85 },
      ]);
      // Simula violação de unique constraint
      mockPrisma.radarAlert.create.mockRejectedValue({ code: 'P2002' });

      // Não deve lançar erro — deve apenas logar e continuar
      await expect(service.checkDocument(MOCK_DOC_ID)).resolves.not.toThrow();
    });
  });
```

- [ ] **Step 2: Rodar os novos testes para confirmar que falham**

```bash
cd apps/api
npx jest src/modules/radars/radars.service.spec.ts --no-coverage -t "checkDocument"
```

Expected: FAIL.

- [ ] **Step 3: Implementar checkDocument em RadarsService**

Adicionar o método em `apps/api/src/modules/radars/radars.service.ts` (após o método `getUnreadCount`):

```typescript
  /**
   * Chamado pelo IngestionService após indexar um documento.
   * Compara o documento contra todos os radares ativos via pgvector.
   * Fire-and-forget — não deve lançar exceção para o caller.
   */
  async checkDocument(documentId: string): Promise<void> {
    // Busca o radar de maior similaridade por documento + tese, filtrando pelo threshold
    // A query usa o embedding do documento (chunks) contra thesis_embedding de cada radar ativo
    const sql = `
      SELECT
        r.id           AS radar_id,
        r.user_id,
        r.title,
        r.threshold,
        MAX(1 - (jc.embedding <=> r.thesis_embedding)) AS max_similarity
      FROM radars r
      INNER JOIN jurisprudence_chunks jc ON jc.document_id = $1::uuid
      WHERE
        r.active = true
        AND r.thesis_embedding IS NOT NULL
        AND jc.embedding IS NOT NULL
      GROUP BY r.id, r.user_id, r.title, r.threshold
      HAVING MAX(1 - (jc.embedding <=> r.thesis_embedding)) >= r.threshold
    `;

    type RadarMatch = {
      radar_id: string;
      user_id: string;
      title: string;
      threshold: number;
      max_similarity: number;
    };

    let matches: RadarMatch[];
    try {
      matches = await this.prisma.$queryRawUnsafe<RadarMatch[]>(sql, documentId);
    } catch (err) {
      this.logger.error(`checkDocument: erro na query pgvector para doc ${documentId}`, err);
      return;
    }

    if (!matches.length) return;

    this.logger.log(`checkDocument: ${matches.length} radares matcharam para doc ${documentId}`);

    for (const match of matches) {
      try {
        // Criar alerta (@@unique evita duplicatas)
        const alert = await this.prisma.radarAlert.create({
          data: {
            radarId: match.radar_id,
            documentId,
            similarity: Number(match.max_similarity),
          },
        });

        // Gerar resumo automaticamente (LLM)
        try {
          const doc = await this.prisma.jurisprudenceDocument.findUnique({
            where: { id: documentId },
            select: { title: true, cleanedText: true, tribunal: true, judgmentDate: true },
          });

          if (doc?.cleanedText) {
            const excerpt = doc.cleanedText.slice(0, 3000);
            const { content } = await this.aiProvider.generateChatCompletion([
              {
                role: 'user',
                content: `Resuma em 3-4 frases a seguinte decisão jurídica, focando nos pontos mais relevantes para advogados:\n\n${excerpt}`,
              },
            ], { maxTokens: 300, temperature: 0.3 });

            await this.prisma.radarAlert.update({
              where: { id: alert.id },
              data: { summary: content },
            });
          }
        } catch (summaryErr) {
          this.logger.warn(`checkDocument: falha ao gerar resumo para alerta ${alert.id}`, summaryErr);
        }

        // Notificar in-app
        await this.notificationsService.createForUser(
          match.user_id,
          `Radar "${match.title}" — nova decisão relevante`,
          `Similaridade: ${Math.round(Number(match.max_similarity) * 100)}%`,
          `/dashboard/radares/${match.radar_id}`,
        );
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Violação de @@unique — documento já alertado para este radar, ignorar silenciosamente
          this.logger.debug(`checkDocument: alerta duplicado ignorado para radar ${match.radar_id}`);
        } else {
          this.logger.error(`checkDocument: erro ao criar alerta para radar ${match.radar_id}`, err);
        }
      }
    }
  }
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
cd apps/api
npx jest src/modules/radars/radars.service.spec.ts --no-coverage
```

Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/radars/
git commit -m "feat(radars): RadarsService.checkDocument com pgvector + resumo automático"
```

---

## Task 5: RadarEmailService

**Files:**
- Create: `apps/api/src/modules/radars/radar-email.service.ts`

- [ ] **Step 1: Instalar nodemailer (se não existir)**

```bash
cd apps/api
npm list nodemailer 2>/dev/null || npm install nodemailer @types/nodemailer
```

- [ ] **Step 2: Implementar RadarEmailService**

```typescript
// apps/api/src/modules/radars/radar-email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class RadarEmailService {
  private readonly logger = new Logger(RadarEmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT', 587),
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP não configurado — emails de radar desativados');
    }
  }

  async sendAlert(params: {
    to: string;
    radarTitle: string;
    documentTitle: string;
    tribunal?: string;
    similarity: number;
    summary?: string;
    alertUrl: string;
  }): Promise<void> {
    if (!this.transporter) return;

    const from = this.config.get<string>('SMTP_FROM', 'LegalAI <no-reply@legalai.com.br>');
    const similarityPct = Math.round(params.similarity * 100);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e27d2; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">⚖️ Radar: nova decisão relevante</h2>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0;">
          <p style="color: #333;"><strong>Radar:</strong> ${params.radarTitle}</p>
          <p style="color: #333;"><strong>Decisão:</strong> ${params.documentTitle}</p>
          ${params.tribunal ? `<p style="color: #333;"><strong>Tribunal:</strong> ${params.tribunal}</p>` : ''}
          <p style="color: #333;"><strong>Similaridade:</strong> ${similarityPct}%</p>
          ${params.summary ? `<div style="background: #fff; border-left: 3px solid #1e27d2; padding: 12px; margin: 16px 0;"><p style="margin: 0; color: #555;">${params.summary}</p></div>` : ''}
          <a href="${params.alertUrl}"
             style="display: inline-block; background: #1e27d2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
            Ver decisão completa
          </a>
        </div>
        <div style="background: #eee; padding: 12px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #888; margin: 0;">LegalAI — Assistente Jurídico com IA</p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject: `[Radar] Nova decisão: ${params.radarTitle} (${similarityPct}% similaridade)`,
        html,
      });
      this.logger.log(`Email de alerta enviado para ${params.to}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email de alerta para ${params.to}`, err);
    }
  }
}
```

- [ ] **Step 3: Injetar RadarEmailService no RadarsService e chamar no checkDocument**

Em `apps/api/src/modules/radars/radars.service.ts`, adicionar no import:
```typescript
import { RadarEmailService } from './radar-email.service';
```

No constructor do `RadarsService`, adicionar após `notificationsService`:
```typescript
    private readonly radarEmailService: RadarEmailService,
```

Dentro de `checkDocument`, após a chamada `notificationsService.createForUser(...)`, adicionar:
```typescript
        // Notificar por email (fire-and-forget interno — falha não bloqueia)
        if (doc) {
          this.radarEmailService.sendAlert({
            to: match.user_id, // NOTA: em produção buscar email do user; ver Step 3b abaixo
            radarTitle: match.title,
            documentTitle: doc.title,
            tribunal: doc.tribunal ?? undefined,
            similarity: Number(match.max_similarity),
            summary: alert.summary ?? undefined,
            alertUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/dashboard/radares/${match.radar_id}`,
          }).catch(() => {});
        }
```

> **Step 3b (email do usuário):** `match.user_id` é o UUID, não o email. Adicionar ao SELECT da query SQL:
> ```sql
> u.email AS user_email,
> ```
> E ao INNER JOIN:
> ```sql
> INNER JOIN users u ON u.id = r.user_id
> ```
> Trocar `to: match.user_id` por `to: match.user_email`. Atualizar o tipo `RadarMatch` para incluir `user_email: string`.

- [ ] **Step 4: Adicionar RadarEmailService ao RadarsModule**

Atualizar `apps/api/src/modules/radars/radars.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RadarsService } from './radars.service';
import { RadarEmailService } from './radar-email.service';

@Module({
  imports: [PrismaModule, RagModule, NotificationsModule],
  providers: [RadarsService, RadarEmailService],
  controllers: [],
  exports: [RadarsService],
})
export class RadarsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/radars/
git commit -m "feat(radars): RadarEmailService com nodemailer + integração em checkDocument"
```

---

## Task 6: Controllers + Impact Analysis

**Files:**
- Create: `apps/api/src/modules/radars/radars.controller.ts`
- Create: `apps/api/src/modules/radars/radar-alerts.controller.ts`

- [ ] **Step 1: Criar RadarsController**

```typescript
// apps/api/src/modules/radars/radars.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RadarsService } from './radars.service';
import { CreateRadarDto } from './dto/create-radar.dto';
import { UpdateRadarDto } from './dto/update-radar.dto';

@Controller('radars')
@UseGuards(JwtAuthGuard)
export class RadarsController {
  constructor(private readonly radarsService: RadarsService) {}

  @Post()
  create(@Body() dto: CreateRadarDto, @Request() req: any) {
    return this.radarsService.create(dto, req.user.id);
  }

  @Get()
  list(@Request() req: any) {
    return this.radarsService.list(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.radarsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRadarDto, @Request() req: any) {
    return this.radarsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.radarsService.remove(id, req.user.id);
  }
}
```

- [ ] **Step 2: Adicionar métodos de alert ao RadarsService**

Adicionar os seguintes métodos em `apps/api/src/modules/radars/radars.service.ts`:

```typescript
  async listAlerts(radarId: string, userId: string) {
    // Verificar ownership
    const radar = await this.prisma.radar.findUnique({ where: { id: radarId } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();

    return this.prisma.radarAlert.findMany({
      where: { radarId },
      include: {
        document: {
          select: {
            id: true, title: true, tribunal: true, processNumber: true,
            judgmentDate: true, summary: true, cleanedText: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAlertRead(radarId: string, alertId: string, userId: string) {
    const radar = await this.prisma.radar.findUnique({ where: { id: radarId } });
    if (!radar) throw new NotFoundException();
    if (radar.userId !== userId) throw new ForbiddenException();

    await this.prisma.radarAlert.update({
      where: { id: alertId },
      data: { readAt: new Date() },
    });
  }

  async generateImpactAnalysis(radarId: string, alertId: string, userId: string): Promise<string> {
    const radar = await this.prisma.radar.findUnique({ where: { id: radarId } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();

    const alert = await this.prisma.radarAlert.findUnique({
      where: { id: alertId },
      include: { document: { select: { cleanedText: true, title: true } } },
    });
    if (!alert) throw new NotFoundException('Alerta não encontrado');

    if (alert.impactAnalysis) return alert.impactAnalysis;

    const excerpt = alert.document.cleanedText?.slice(0, 4000) ?? '';
    const { content } = await this.aiProvider.generateChatCompletion([
      {
        role: 'user',
        content: `Tese monitorada: "${radar.thesisText}"\n\nDecisão:\n${excerpt}\n\nAnalise o impacto desta decisão para advogados que trabalham com a tese acima. Seja direto e prático, em 4-5 frases.`,
      },
    ], { maxTokens: 400, temperature: 0.4 });

    await this.prisma.radarAlert.update({
      where: { id: alertId },
      data: { impactAnalysis: content },
    });

    return content;
  }
```

- [ ] **Step 3: Criar RadarAlertsController**

```typescript
// apps/api/src/modules/radars/radar-alerts.controller.ts
import {
  Controller, Get, Post, Patch, Param, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RadarsService } from './radars.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class RadarAlertsController {
  constructor(private readonly radarsService: RadarsService) {}

  // Path separado de GET /radars/:id para evitar conflito de rota NestJS
  @Get('radar-alerts/unread-count')
  getUnreadCount(@Request() req: any) {
    return this.radarsService.getUnreadCount(req.user.id).then((count) => ({ count }));
  }

  @Get('radars/:id/alerts')
  listAlerts(@Param('id') id: string, @Request() req: any) {
    return this.radarsService.listAlerts(id, req.user.id);
  }

  @Patch('radars/:id/alerts/:alertId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(
    @Param('id') id: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.radarsService.markAlertRead(id, alertId, req.user.id);
  }

  @Post('radars/:id/alerts/:alertId/analyze')
  analyze(
    @Param('id') id: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.radarsService.generateImpactAnalysis(id, alertId, req.user.id)
      .then((impactAnalysis) => ({ impactAnalysis }));
  }
}
```

- [ ] **Step 4: Registrar controllers no módulo**

Atualizar `apps/api/src/modules/radars/radars.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RadarsService } from './radars.service';
import { RadarEmailService } from './radar-email.service';
import { RadarsController } from './radars.controller';
import { RadarAlertsController } from './radar-alerts.controller';

@Module({
  imports: [PrismaModule, RagModule, NotificationsModule],
  providers: [RadarsService, RadarEmailService],
  controllers: [RadarsController, RadarAlertsController],
  exports: [RadarsService],
})
export class RadarsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/radars/
git commit -m "feat(radars): controllers CRUD + radar-alerts (list, read, analyze)"
```

---

## Task 7: Hook no IngestionService + Registro no AppModule

**Files:**
- Modify: `apps/api/src/modules/ingestion/ingestion.service.ts`
- Modify: `apps/api/src/modules/ingestion/ingestion.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Injetar RadarsService em IngestionService**

Em `apps/api/src/modules/ingestion/ingestion.service.ts`, adicionar no import do topo:

```typescript
import { RadarsService } from '../radars/radars.service';
```

No constructor, adicionar após `@Optional() private readonly webhooksService?: WebhooksService,`:

```typescript
    @Optional() private readonly radarsService?: RadarsService,
```

- [ ] **Step 2: Adicionar hook pós-indexação**

No `ingestion.service.ts`, após a linha `addLog(\`Indexado: "${collected.title}" (${chunks.length} chunks)\`)` (que vem depois do update de status para `INDEXED`), adicionar:

```typescript
          // Disparar radar check de forma assíncrona (fire-and-forget)
          if (this.radarsService) {
            this.radarsService.checkDocument(document.id).catch((err) =>
              this.logger.error(`Radar check falhou para doc ${document.id}`, err),
            );
          }
```

- [ ] **Step 3: Importar RadarsModule em IngestionModule**

Atualizar `apps/api/src/modules/ingestion/ingestion.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CollectorsModule } from '../collectors/collectors.module';
import { RagModule } from '../rag/rag.module';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RadarsModule } from '../radars/radars.module';

@Module({
  imports: [PrismaModule, CollectorsModule, RagModule, NotificationsModule, WebhooksModule, RadarsModule],
  providers: [IngestionService],
  controllers: [IngestionController],
  exports: [IngestionService],
})
export class IngestionModule {}
```

- [ ] **Step 4: Registrar RadarsModule no AppModule**

Em `apps/api/src/app.module.ts`, adicionar no topo:

```typescript
import { RadarsModule } from './modules/radars/radars.module';
```

Na lista de imports do `@Module`, adicionar `RadarsModule` (após `CasesModule`):

```typescript
    RadarsModule,
```

- [ ] **Step 5: Verificar que o servidor compila sem erros**

```bash
cd apps/api
npx ts-node -e "import('./src/main')" 2>&1 | head -20
# Ou apenas:
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/ingestion/ apps/api/src/app.module.ts
git commit -m "feat(radars): hook pós-ingestão + registro no AppModule"
```

---

## Task 8: Frontend — API Client

**Files:**
- Modify: `apps/web/src/lib/api-client.ts`

- [ ] **Step 1: Adicionar métodos de radar ao ApiClient**

Localizar o final da classe `ApiClient` em `apps/web/src/lib/api-client.ts` e adicionar:

```typescript
  // ─── RADARES ────────────────────────────────────────────────────────────────

  async getRadars() {
    const res = await this.client.get('/radars');
    return res.data;
  }

  async createRadar(data: { title: string; thesisText: string; threshold?: number; caseId?: string }) {
    const res = await this.client.post('/radars', data);
    return res.data;
  }

  async getRadar(id: string) {
    const res = await this.client.get(`/radars/${id}`);
    return res.data;
  }

  async updateRadar(id: string, data: Partial<{ title: string; thesisText: string; threshold: number; caseId: string; active: boolean }>) {
    const res = await this.client.patch(`/radars/${id}`, data);
    return res.data;
  }

  async deleteRadar(id: string) {
    await this.client.delete(`/radars/${id}`);
  }

  async getRadarAlerts(radarId: string) {
    const res = await this.client.get(`/radars/${radarId}/alerts`);
    return res.data;
  }

  async markRadarAlertRead(radarId: string, alertId: string) {
    await this.client.patch(`/radars/${radarId}/alerts/${alertId}/read`);
  }

  async analyzeRadarAlert(radarId: string, alertId: string) {
    const res = await this.client.post(`/radars/${radarId}/alerts/${alertId}/analyze`);
    return res.data;
  }

  async getRadarUnreadCount(): Promise<{ count: number }> {
    const res = await this.client.get('/radar-alerts/unread-count');
    return res.data;
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api-client.ts
git commit -m "feat(radares): métodos de radar no ApiClient"
```

---

## Task 9: Frontend — Página /dashboard/radares

**Files:**
- Create: `apps/web/src/app/dashboard/radares/page.tsx`

- [ ] **Step 1: Criar a página de listagem de radares**

```typescript
// apps/web/src/app/dashboard/radares/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Radio, Plus, Search, Trash2, ChevronRight, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';
import { FadeIn, StaggerContainer, StaggerItem, InteractiveCard } from '@/components/ui/motion';
import { PlanetLoader } from '@/components/ui/planet-loader';

const emptyForm = { title: '', thesisText: '', threshold: 0.8, caseId: '' };

export default function RadaresPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: radars = [], isLoading } = useQuery({
    queryKey: ['radars'],
    queryFn: () => apiClient.getRadars(),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases(),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createRadar({
      title: form.title,
      thesisText: form.thesisText,
      threshold: form.threshold,
      caseId: form.caseId || undefined,
    }),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ['radars'] });
      toast.success('Radar criado com sucesso');
      setShowModal(false);
      setForm(emptyForm);
      router.push(`/dashboard/radares/${created.id}`);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.updateRadar(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['radars'] }),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteRadar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radars'] });
      toast.success('Radar removido');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const filtered = radars.filter((r: any) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.thesisText.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600/15 border border-brand-500/20 rounded-xl flex items-center justify-center">
              <Radio className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Meus Radares</h1>
              <p className="text-slate-500 text-sm">
                {radars.filter((r: any) => r.active).length} ativo{radars.filter((r: any) => r.active).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Radar
          </button>
        </div>
      </FadeIn>

      {/* Search */}
      <FadeIn delay={0.1}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou tese..."
            className="w-full bg-[#141414] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
          />
        </div>
      </FadeIn>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <PlanetLoader size="sm" />
        </div>
      ) : filtered.length === 0 ? (
        <FadeIn delay={0.15}>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mb-4">
              <Radio className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-300 font-medium">Nenhum radar encontrado</p>
            <p className="text-slate-600 text-sm mt-1 max-w-xs">
              {search ? 'Tente outros termos.' : 'Crie um radar para monitorar decisões relevantes à sua tese.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/20 text-brand-400 text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro radar
              </button>
            )}
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((r: any) => {
            const unread = r._count?.alerts ?? 0;
            return (
              <StaggerItem key={r.id}>
                <InteractiveCard
                  className="group bg-[#141414] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.14] hover:bg-[#161616] transition-all cursor-pointer"
                  onClick={() => router.push(`/dashboard/radares/${r.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium',
                          r.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400',
                        )}>
                          {r.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-400 border border-brand-500/20">
                          {Math.round(r.threshold * 100)}% similaridade
                        </span>
                        {r.case && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 truncate max-w-[120px]">
                            {r.case.title}
                          </span>
                        )}
                        {unread > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                            {unread} novo{unread > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <h3 className="text-slate-100 font-semibold text-sm">{r.title}</h3>
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{r.thesisText}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: r.id, active: !r.active }); }}
                        className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all"
                        title={r.active ? 'Desativar' : 'Ativar'}
                      >
                        {r.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remover o radar "${r.title}"?`)) deleteMutation.mutate(r.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                </InteractiveCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-slate-100 font-semibold">Novo Radar</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Título do radar *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Dano Moral por Negativação Indevida"
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Tese jurídica *</label>
                <textarea
                  value={form.thesisText}
                  onChange={(e) => setForm((f) => ({ ...f, thesisText: e.target.value }))}
                  placeholder="Descreva a tese que você quer monitorar em linguagem natural..."
                  rows={3}
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">
                  Limiar de similaridade — <span className="text-brand-400 font-semibold">{Math.round(form.threshold * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={5}
                  value={Math.round(form.threshold * 100)}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) / 100 }))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>60% (amplo)</span>
                  <span>100% (preciso)</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Caso associado (opcional)</label>
                <select
                  value={form.caseId}
                  onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                >
                  <option value="">Nenhum</option>
                  {cases.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/[0.06]">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.title.trim() || !form.thesisText.trim() || createMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
              >
                {createMutation.isPending ? <PlanetLoader size="xs" /> : <Plus className="w-4 h-4" />}
                Criar Radar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/radares/page.tsx
git commit -m "feat(radares): página de listagem /dashboard/radares"
```

---

## Task 10: Frontend — Página /dashboard/radares/[id]

**Files:**
- Create: `apps/web/src/app/dashboard/radares/[id]/page.tsx`

- [ ] **Step 1: Criar a página de detalhe do radar**

```typescript
// apps/web/src/app/dashboard/radares/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Radio, ArrowLeft, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { PlanetLoader } from '@/components/ui/planet-loader';

type Tab = 'alertas' | 'configuracoes';

export default function RadarDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = params;
  const [tab, setTab] = useState<Tab>('alertas');
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [impactResults, setImpactResults] = useState<Record<string, string>>({});
  const [configForm, setConfigForm] = useState<any>(null);

  // TanStack Query v5: onSuccess foi removido. Usar useEffect para inicializar configForm.
  const { data: radar, isLoading: loadingRadar } = useQuery({
    queryKey: ['radar', id],
    queryFn: () => apiClient.getRadar(id),
  });

  useEffect(() => {
    if (radar && !configForm) {
      setConfigForm({
        title: (radar as any).title,
        thesisText: (radar as any).thesisText,
        threshold: (radar as any).threshold,
        active: (radar as any).active,
        caseId: (radar as any).caseId ?? '',
      });
    }
  }, [radar]);

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['radar-alerts', id],
    queryFn: () => apiClient.getRadarAlerts(id),
    enabled: tab === 'alertas',
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases(),
  });

  const markReadMutation = useMutation({
    mutationFn: (alertId: string) => apiClient.markRadarAlertRead(id, alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['radar-alerts', id] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateRadar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radar', id] });
      queryClient.invalidateQueries({ queryKey: ['radars'] });
      toast.success('Radar atualizado');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const handleAnalyze = async (alertId: string) => {
    setAnalyzingId(alertId);
    try {
      const { impactAnalysis } = await apiClient.analyzeRadarAlert(id, alertId);
      setImpactResults((prev) => ({ ...prev, [alertId]: impactAnalysis }));
      queryClient.invalidateQueries({ queryKey: ['radar-alerts', id] });
    } catch (e) {
      toast.error(extractApiErrorMessage(e));
    } finally {
      setAnalyzingId(null);
    }
  };

  if (loadingRadar) {
    return <div className="flex items-center justify-center h-64"><PlanetLoader size="md" /></div>;
  }

  if (!radar) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/dashboard/radares')}
            className="mt-1 p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-brand-600/15 border border-brand-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Radio className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-100 truncate">{radar.title}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                radar.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400',
              )}>
                {radar.active ? 'Ativo' : 'Inativo'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-400 border border-brand-500/20">
                {Math.round(radar.threshold * 100)}% similaridade
              </span>
              {radar.case && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                  {radar.case.title}
                </span>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.05}>
        <div className="flex gap-1 bg-[#111111] border border-white/[0.06] rounded-xl p-1">
          {(['alertas', 'configuracoes'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize',
                tab === t
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {t === 'alertas' ? 'Alertas' : 'Configurações'}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Tab: Alertas */}
      {tab === 'alertas' && (
        loadingAlerts ? (
          <div className="flex items-center justify-center h-40"><PlanetLoader size="sm" /></div>
        ) : alerts.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mb-4">
                <Radio className="w-6 h-6 text-slate-700" />
              </div>
              <p className="text-slate-400 font-medium text-sm">Nenhum alerta ainda</p>
              <p className="text-slate-600 text-xs mt-1">Alertas aparecerão aqui quando novas decisões relevantes forem ingeridas.</p>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {alerts.map((alert: any) => {
              const isUnread = !alert.readAt;
              const summaryExpanded = expandedSummary === alert.id;
              const impactText = impactResults[alert.id] || alert.impactAnalysis;

              return (
                <StaggerItem key={alert.id}>
                  <div
                    className={cn(
                      'bg-[#141414] border rounded-xl p-5 transition-all',
                      isUnread ? 'border-brand-500/30' : 'border-white/[0.07]',
                    )}
                    onClick={() => isUnread && markReadMutation.mutate(alert.id)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnread && <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />}
                        {alert.document.tribunal && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.07] text-slate-400 font-medium">
                            {alert.document.tribunal}
                          </span>
                        )}
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                          alert.similarity >= 0.9 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-600/20 text-brand-400',
                        )}>
                          {Math.round(alert.similarity * 100)}% match
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-slate-200 text-sm font-medium mb-1">{alert.document.title}</h4>
                    {alert.document.cleanedText && (
                      <p className="text-slate-500 text-xs line-clamp-2 mb-3">{alert.document.cleanedText.slice(0, 200)}...</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {alert.summary && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedSummary(summaryExpanded ? null : alert.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/20 text-brand-400 text-xs rounded-lg transition-all"
                        >
                          {summaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          Ver resumo
                        </button>
                      )}
                      {!impactText && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAnalyze(alert.id); }}
                          disabled={analyzingId === alert.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {analyzingId === alert.id ? <PlanetLoader size="xs" /> : <Sparkles className="w-3 h-3" />}
                          Analisar impacto
                        </button>
                      )}
                    </div>

                    {summaryExpanded && alert.summary && (
                      <div className="mt-3 p-3 bg-brand-600/5 border border-brand-500/15 rounded-lg">
                        <p className="text-slate-300 text-xs leading-relaxed">{alert.summary}</p>
                      </div>
                    )}

                    {impactText && (
                      <div className="mt-3 p-3 bg-violet-500/5 border border-violet-500/15 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-violet-400" />
                          <span className="text-[10px] text-violet-400 font-medium">Análise de impacto</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">{impactText}</p>
                      </div>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )
      )}

      {/* Tab: Configurações */}
      {tab === 'configuracoes' && configForm && (
        <FadeIn>
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Título</label>
              <input
                value={configForm.title}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Tese jurídica</label>
              <textarea
                value={configForm.thesisText}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, thesisText: e.target.value }))}
                rows={4}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all resize-none"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">
                Limiar de similaridade — <span className="text-brand-400 font-semibold">{Math.round(configForm.threshold * 100)}%</span>
              </label>
              <input
                type="range" min={60} max={100} step={5}
                value={Math.round(configForm.threshold * 100)}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, threshold: Number(e.target.value) / 100 }))}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Caso associado</label>
              <select
                value={configForm.caseId}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, caseId: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
              >
                <option value="">Nenhum</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 text-sm">Radar ativo</span>
              <button
                onClick={() => setConfigForm((f: any) => ({ ...f, active: !f.active }))}
                className={cn(
                  'relative w-10 h-5.5 rounded-full transition-colors',
                  configForm.active ? 'bg-emerald-500' : 'bg-slate-700',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  configForm.active ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
            </div>
            <button
              onClick={() => updateMutation.mutate({ ...configForm, caseId: configForm.caseId || null })}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {updateMutation.isPending ? <PlanetLoader size="xs" /> : <Check className="w-4 h-4" />}
              Salvar alterações
            </button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/dashboard/radares/"
git commit -m "feat(radares): página de detalhe /dashboard/radares/[id]"
```

---

## Task 11: Frontend — Sidebar + Badge no Header

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`
- Modify: `apps/web/src/components/layout/header.tsx`

- [ ] **Step 1: Adicionar "Radares" no Sidebar**

Em `apps/web/src/components/layout/sidebar.tsx`, no array `navGroups`, dentro do grupo `'IA & Casos'`, adicionar após `{ href: '/dashboard/casos', ... }`:

```typescript
      { href: '/dashboard/radares', icon: Radio, label: 'Radar de Jurisprudência', badge: 'New!', badgeColor: 'emerald' },
```

Verificar que `Radio` está no import de lucide-react no topo do arquivo. Se não estiver, adicionar `Radio` ao import existente.

- [ ] **Step 2: Adicionar badge de radar unread no Header**

Em `apps/web/src/components/layout/header.tsx`, após a query `notifications`, adicionar:

```typescript
  const { data: radarUnread } = useQuery({
    queryKey: ['radar-unread'],
    queryFn: () => apiClient.getRadarUnreadCount(),
    refetchInterval: 60000,
    enabled: mounted,
  });
  const radarUnreadCount = radarUnread?.count ?? 0;
```

No JSX, localizar o ícone `Bell` e adicionar um indicador se `radarUnreadCount > 0`. Após o existing Bell button, adicionar um indicador no badge (ou sobrepor ao sino existente). A forma mais simples é adicionar o count de radar ao unread count existente:

Localizar `const unreadCount = notifications.filter((n: any) => !n.read).length;` e alterar para:

```typescript
  const unreadCount = notifications.filter((n: any) => !n.read).length + radarUnreadCount;
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx apps/web/src/components/layout/header.tsx
git commit -m "feat(radares): radar no sidebar + badge unread no header"
```

---

## Task 12: Integração na Página de Caso

**Files:**
- Modify: `apps/web/src/app/dashboard/casos/[id]/page.tsx`

- [ ] **Step 1: Adicionar query de radares vinculados ao caso na página de detalhe**

Localizar `apps/web/src/app/dashboard/casos/[id]/page.tsx`. Adicionar uma query para buscar radares do caso:

```typescript
const { data: caseRadars = [] } = useQuery({
  queryKey: ['radars'],
  queryFn: () => apiClient.getRadars(),
  select: (radars: any[]) => radars.filter((r) => r.caseId === params.id),
});
```

- [ ] **Step 2: Adicionar seção "Radares" na aba de detalhes ou ao final da página**

Na aba/seção adequada da página (após os documentos ou em seção dedicada), adicionar:

```tsx
{caseRadars.length > 0 && (
  <div className="mt-6 space-y-3">
    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Radares vinculados</h3>
    {caseRadars.map((r: any) => {
      const unread = r._count?.alerts ?? 0;
      return (
        <Link
          key={r.id}
          href={`/dashboard/radares/${r.id}`}
          className="flex items-center justify-between bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3 hover:border-white/[0.14] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-slate-200 text-sm">{r.title}</span>
          </div>
          {unread > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
              {unread} novo{unread > 1 ? 's' : ''}
            </span>
          )}
        </Link>
      );
    })}
  </div>
)}
```

Adicionar `Radio` ao import de lucide-react e `Link` ao import de next/link se não existirem.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/dashboard/casos/"
git commit -m "feat(radares): seção 'Radares vinculados' na página de caso"
```

---

## Task 13: Smoke Test + Tag

- [ ] **Step 1: Verificar compilação TypeScript do frontend**

```bash
cd apps/web
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 2: Verificar compilação TypeScript do backend**

```bash
cd apps/api
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Rodar todos os testes do módulo radars**

```bash
cd apps/api
npx jest src/modules/radars/ --no-coverage
```

Expected: PASS.

- [ ] **Step 4: Subir o servidor e verificar rota basic**

```bash
cd /Users/edu/rag
docker compose up postgres redis -d
npm run dev
```

Em outro terminal:
```bash
curl -s http://localhost:3001/api/v1/radars -H "Authorization: Bearer <token>" | jq .
```

Expected: `[]` (lista vazia).

- [ ] **Step 5: Commit final + tag**

```bash
git add -A
git commit -m "feat: Radar de Jurisprudência em Tempo Real (v1.6.0)"
git tag v1.6.0
```
