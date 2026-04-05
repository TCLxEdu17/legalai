# Radar de Jurisprudência em Tempo Real — Design Spec

**Data:** 2026-03-23
**Projeto:** LegalAI (Lexis)
**Status:** Aprovado para implementação

---

## Visão Geral

O Radar de Jurisprudência permite que advogados cadastrem teses jurídicas e recebam alertas automáticos quando novas decisões relevantes são ingeridas no sistema — cruzando os tribunais já configurados em `/dashboard/fontes` com embeddings semânticos via pgvector.

---

## Decisões de Design

### Abordagem: Hook pós-ingestão
Após o `IngestionService` persistir um novo `JurisprudenceDocument`, dispara um radar check via `RadarsService.checkDocument()` com injeção `@Optional()` — mesmo padrão de `NotificationsService` e `WebhooksService` já existentes no `IngestionService`. A chamada é fire-and-forget (não bloqueia a ingestão).

### Relevância via pgvector
O threshold é configurável por radar (60–100%). A comparação ocorre entre o embedding da tese do radar e os `jurisprudence_chunks` do documento recém-ingerido — usando o operador `<=>` (cosine distance) em SQL raw, referência: `VectorSearchService`. O score de alerta é o máximo entre todos os chunks. A query de chunks é feita **dentro** de `checkDocument(documentId)` — sem passar chunks pelo caller.

### Notificações
- **In-app:** badge no navbar, contagem via `GET /radar-alerts/unread-count` (path separado para evitar conflito com `GET /radars/:id`)
- **Email:** nodemailer + SMTP gratuito (zero custo adicional) via `RadarEmailService` (nome distinto de `NotificationsService` existente)
- **Resumo:** gerado automaticamente por LLM dentro de `checkDocument()` — síncrono ao check, mas todo o bloco é fire-and-forget. Latência aceitável no MVP.
- **Análise de impacto:** gerada sob demanda via botão "Analisar impacto"

### Escopo de fontes
Reutiliza `ExternalSource` já cadastradas pelo usuário em `/dashboard/fontes` — zero configuração extra.

### Vínculo com casos
Radar pode ser standalone ou associado a um `Case` existente. Ambos convivem.

---

## Modelo de Dados

### `Radar`
```prisma
model Radar {
  id         String   @id @default(cuid())
  userId     String   @db.Uuid
  caseId     String?  @db.Uuid
  title      String
  thesisText String   @db.Text
  // thesisEmbedding vector(1536) — gerenciado via $executeRaw após migration
  // (mesmo padrão de case_chunks.embedding e jurisprudence_chunks.embedding)
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
```

### `RadarAlert`
```prisma
model RadarAlert {
  id               String    @id @default(cuid())
  radarId          String    @map("radar_id") @db.Uuid
  documentId       String    @map("document_id") @db.Uuid
  similarity       Float
  summary          String?   @db.Text   // gerado automaticamente pelo LLM
  impactAnalysis   String?   @db.Text @map("impact_analysis")  // gerado sob demanda
  notifiedByEmail  Boolean   @default(false) @map("notified_by_email")
  readAt           DateTime? @map("read_at")
  createdAt        DateTime  @default(now()) @map("created_at")

  radar    Radar                 @relation(fields: [radarId], references: [id], onDelete: Cascade)
  document JurisprudenceDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([radarId, documentId])  // deduplicação: mesmo doc não gera 2 alertas no mesmo radar
  @@index([radarId])
  @@index([readAt])
  @@map("radar_alerts")
}
```

**Nota:** `thesisEmbedding` é adicionado via `$executeRaw` após a migration, com HNSW index — mesmo padrão de `case_chunks` e `jurisprudence_chunks`.

**Relações a adicionar:**
- `User` model: `radars Radar[]`
- `Case` model: `radars Radar[]`
- `JurisprudenceDocument` model: `radarAlerts RadarAlert[]`

---

## Backend

### `RadarsModule`
Módulo independente em `apps/api/src/modules/radars/`.

**`RadarsController`** — endpoints JWT-protected:
- `POST /radars` — cria radar, gera `thesisEmbedding` via `EmbeddingsService`
- `GET /radars` — lista radares do usuário (com contagem de alertas não lidos)
- `GET /radars/:id` — detalhe do radar
- `PATCH /radars/:id` — atualiza (se tese mudar, regenera embedding)
- `DELETE /radars/:id`

**`RadarAlertsController`** — prefixo `/radar-alerts`:
- `GET /radar-alerts/unread-count` — contagem global para badge do navbar (**path separado de `/radars/:id` para evitar conflito de rota NestJS**)
- `GET /radars/:id/alerts` — lista alertas do radar (paginado)
- `PATCH /radars/:id/alerts/:alertId/read` — marca como lido
- `POST /radars/:id/alerts/:alertId/analyze` — gera `impactAnalysis` sob demanda

**`RadarsService`**:
- `create()` — persiste radar + gera embedding via `EmbeddingsService` (referência: `CasesService.create()`)
- `checkDocument(documentId: string): Promise<void>` — query pgvector (busca chunks internamente), cria `RadarAlert` se `similarity >= threshold`, gera resumo via LLM, dispara notificações. **Assinatura: apenas `documentId`, chunks buscados internamente via SQL.**
- `generateSummary(documentId: string): Promise<string>` — LLM call para resumo da decisão

**`RadarEmailService`** (nome distinto de `NotificationsService` existente — evita colisão de DI):
- `sendAlert(to, radarTitle, documentTitle, similarity, summary, alertUrl): Promise<void>` — nodemailer com template HTML
- Registrado apenas dentro de `RadarsModule`

### Modificação em `IngestionService`
Injeção com `@Optional()` — mesmo padrão de `notificationsService` e `webhooksService` já existentes:

```typescript
// apps/api/src/modules/ingestion/ingestion.service.ts
constructor(
  // ... deps existentes ...
  @Optional() private readonly radarsService?: RadarsService,
) {}

// Após persistir documento e chunks:
this.radarsService?.checkDocument(savedDocument.id).catch((err) =>
  this.logger.error('Radar check falhou', err)
);
```

`RadarsModule` deve ser importado em `IngestionModule` e deve exportar `RadarsService`.

---

## Frontend

### Páginas novas

**`/dashboard/radares`** — Lista de Radares
- Header: ícone Radar, título "Meus Radares", contador de radares ativos, botão "Novo Radar"
- Search bar
- Lista de cards (padrão `InteractiveCard`): título, trecho da tese, threshold badge, caso vinculado (opcional), contador de alertas não lidos (emerald quando > 0), toggle ativo/inativo
- Empty state com CTA
- Modal de criação: título*, texto da tese* (textarea), threshold (slider 60–100% com valor live), caso associado (select opcional)

**`/dashboard/radares/[id]`** — Detalhe do Radar
- Header: back arrow, título, status badge (ativo/inativo), threshold badge, caso vinculado
- Tabs: "Alertas" | "Configurações"
- **Tab Alertas:** lista de `RadarAlert`; cada card: tribunal, data, score de similaridade, trecho da decisão, botão "Ver resumo" (expande inline), botão "Analisar impacto" (on-demand, tons violeta), dot azul para não lidos
- **Tab Configurações:** editar tese, threshold, caso vinculado, toggle ativo/inativo, botão salvar

### Badge no Navbar
Contador no ícone de sino no `Header` consultando `GET /radar-alerts/unread-count` a cada 60s. **Nota:** o `Header` já faz polling de notificações a cada 60s; este é um segundo query independente — badge exibido junto ao sino existente ou como indicador separado no ícone de Radares no sidebar.

### Integração Casos
Em `/dashboard/casos/[id]`, nova seção "Radares vinculados" listando radares do caso e seus alertas recentes.

### Sidebar
Adicionar link "Radares" no grupo "IA & Casos" de `apps/web/src/components/layout/sidebar.tsx`.

### Design
Segue exatamente o design system existente (dark theme, brand-600, dark-cards). Mockups aprovados:
- Lista: https://p.superdesign.dev/draft/56a29365-8db4-4e25-8543-1007254d7b43
- Detalhe: https://p.superdesign.dev/draft/2e124dc7-12d5-45be-91e5-f240b6e6b019

---

## Configuração de Ambiente

Novas env vars necessárias:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=no-reply@legalai.com.br
SMTP_PASS=<app-password>
SMTP_FROM="LegalAI <no-reply@legalai.com.br>"
```

---

## Referências no Codebase

| O quê | Onde |
|-------|------|
| Padrão `@Optional()` em IngestionService | `apps/api/src/modules/ingestion/ingestion.service.ts` |
| Padrão embedding via `$executeRaw` | `apps/api/src/modules/rag/embeddings.service.ts` |
| Padrão cosine distance SQL | `apps/api/src/modules/rag/vector-search.service.ts` |
| Badge navbar | `apps/web/src/components/layout/header.tsx` |
| Sidebar nav groups | `apps/web/src/components/layout/sidebar.tsx` |

---

## Checklist de Implementação (alto nível)

- [ ] Migration Prisma: adicionar `Radar`, `RadarAlert`, relações em `User`/`Case`/`JurisprudenceDocument`
- [ ] Raw SQL pós-migration: coluna `thesis_embedding vector(1536)` + HNSW index em `radars`
- [ ] `RadarsModule`: `RadarsService` + `RadarsController` + `RadarAlertsController` + `RadarEmailService` + DTOs
- [ ] Modificar `IngestionService`: injetar `RadarsService` com `@Optional()`, hook fire-and-forget
- [ ] Importar `RadarsModule` em `IngestionModule`
- [ ] Frontend: página `/dashboard/radares`
- [ ] Frontend: página `/dashboard/radares/[id]`
- [ ] Frontend: badge no navbar (`Header`)
- [ ] Frontend: seção "Radares" em `/dashboard/casos/[id]`
- [ ] Adicionar "Radares" no Sidebar (grupo "IA & Casos")
- [ ] Testes: unit em `RadarsService.checkDocument`, integration em endpoints
