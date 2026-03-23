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
Após o `IngestionService` persistir um novo `JurisprudenceDocument`, dispara um radar check via `RadarsService.checkDocument()`. Desacoplamento via interface, sem nova infraestrutura de filas.

### Relevância via pgvector
O threshold é configurável por radar (60–100%). A comparação ocorre entre o embedding da tese do radar e os `jurisprudence_chunks` do documento recém-ingerido — usando o operador `<=>` (cosine distance) em SQL raw. O score de alerta é o máximo entre todos os chunks.

### Notificações
- **In-app:** badge no navbar, contagem via `GET /radars/alerts/unread-count`
- **Email:** nodemailer + SMTP gratuito (zero custo adicional)
- **Resumo:** gerado automaticamente por LLM ao criar o alerta
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
  id               String    @id @default(cuid())
  userId           String
  caseId           String?
  title            String
  thesisText       String
  // thesisEmbedding vector(1536) — gerenciado via $executeRaw (mesmo padrão de case_chunks)
  threshold        Float     @default(0.8)
  active           Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  case   Case?   @relation(fields: [caseId], references: [id], onDelete: SetNull)
  alerts RadarAlert[]

  @@index([userId])
  @@index([active])
}
```

### `RadarAlert`
```prisma
model RadarAlert {
  id               String    @id @default(cuid())
  radarId          String
  documentId       String
  similarity       Float
  summary          String?   // gerado automaticamente pelo LLM
  impactAnalysis   String?   // gerado sob demanda
  notifiedByEmail  Boolean   @default(false)
  readAt           DateTime?
  createdAt        DateTime  @default(now())

  radar    Radar                  @relation(fields: [radarId], references: [id], onDelete: Cascade)
  document JurisprudenceDocument  @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([radarId, documentId])  // deduplicação: mesmo doc não gera 2 alertas no mesmo radar
  @@index([radarId])
  @@index([readAt])
}
```

**Nota:** `thesisEmbedding` é adicionado via `$executeRaw` após a migration, mesmo padrão de `case_chunks.embedding`.

---

## Backend

### `RadarsModule`
Módulo independente em `apps/api/src/modules/radars/`.

**`RadarsController`** — endpoints JWT-protected:
- `POST /radars` — cria radar, gera `thesisEmbedding` via OpenAI
- `GET /radars` — lista radares do usuário (com `_count.alerts` não lidos)
- `GET /radars/:id` — detalhe do radar
- `PATCH /radars/:id` — atualiza (se tese mudar, regenera embedding)
- `DELETE /radars/:id`
- `GET /radars/alerts/unread-count` — contagem global para badge do navbar

**`RadarAlertsController`**:
- `GET /radars/:id/alerts` — lista alertas do radar (paginado)
- `PATCH /radars/:id/alerts/:alertId/read` — marca como lido
- `POST /radars/:id/alerts/:alertId/analyze` — gera `impactAnalysis` sob demanda

**`RadarsService`**:
- `create()` — persiste radar + gera embedding via `EmbeddingsService`
- `checkDocument(documentId, chunks)` — query pgvector, cria `RadarAlert` se relevante, dispara notificações
- `generateSummary(documentId)` — LLM call para resumo da decisão

**`NotificationsService`** (dentro de `RadarsModule`):
- `sendEmail(to, subject, html)` — nodemailer com SMTP configurado via env vars
- `getUnreadCount(userId)` — query `RadarAlert` com `readAt IS NULL`

### Modificação em `IngestionService`
Após persistir `JurisprudenceDocument`, chama `RadarsService.checkDocument()`. A chamada é fire-and-forget (não bloqueia a ingestão) — wrapped em `try/catch` para não quebrar o pipeline se o módulo falhar.

```typescript
// apps/api/src/modules/ingestion/ingestion.service.ts
// Após persistir documento e chunks:
this.radarsService.checkDocument(savedDocument.id).catch((err) =>
  this.logger.error('Radar check falhou', err)
);
```

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
- **Tab Alertas:** lista de `RadarAlert`; cada card mostra: tribunal, data, score de similaridade, trecho da decisão, botão "Ver resumo" (expande inline), botão "Analisar impacto" (on-demand, tons violeta), dot azul para não lidos
- **Tab Configurações:** editar tese, threshold, caso vinculado, toggle ativo/inativo, botão salvar

### Badge no Navbar
Contador vermelho/emerald no ícone de sino no `Header` component, consultando `GET /radars/alerts/unread-count` a cada 60s.

### Integração Casos
Em `/dashboard/casos/[id]`, nova seção "Radares vinculados" listando radares do caso e seus alertas recentes.

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

## Checklist de Implementação (alto nível)

- [ ] Migration Prisma: adicionar `Radar`, `RadarAlert`, coluna `thesisEmbedding` via raw SQL, HNSW index
- [ ] `RadarsModule`: service + controller + DTOs
- [ ] `NotificationsService`: email via nodemailer
- [ ] Modificar `IngestionService`: hook pós-ingestão (fire-and-forget)
- [ ] Adicionar relação `Radar[]` no model `User` e `Case` do Prisma
- [ ] Frontend: página `/dashboard/radares`
- [ ] Frontend: página `/dashboard/radares/[id]`
- [ ] Frontend: badge no navbar (`Header`)
- [ ] Frontend: seção "Radares" em `/dashboard/casos/[id]`
- [ ] Adicionar "Radares" no Sidebar (grupo "IA & Casos")
- [ ] Testes: unit em `RadarsService.checkDocument`, integration em endpoints
