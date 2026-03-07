# LegalAI — Assistente Jurídico com IA

MVP de assistente jurídico com RAG (Retrieval-Augmented Generation), desenvolvido para demonstração a advogados.

---

## Visão geral da arquitetura

```
legal-ai/
├── apps/
│   ├── api/          # NestJS — Backend REST + RAG pipeline
│   └── web/          # Next.js 14 — Interface do usuário
├── scripts/
│   └── init-db.sql   # Habilita pgvector e uuid-ossp
├── docker-compose.yml
└── .env.example
```

### Fluxo RAG

```
Upload → Extração de texto → Chunking → Embeddings → pgvector
                                                         ↓
Pergunta → Embedding da query → Busca vetorial (cosine) → Top-K chunks
                                                              ↓
                                            Prompt + contexto → LLM → Resposta com fontes
```

### Stack

| Camada          | Tecnologia                              |
|-----------------|----------------------------------------|
| Backend         | NestJS + TypeScript                    |
| Frontend        | Next.js 14 + Tailwind CSS              |
| Banco de dados  | PostgreSQL 16 + pgvector               |
| ORM             | Prisma                                 |
| Autenticação    | JWT + Refresh Token (rotação)          |
| Embeddings      | OpenAI text-embedding-3-small          |
| LLM             | OpenAI GPT-4o (ou Anthropic claude-opus-4-6) |
| File parsing    | pdf-parse, mammoth                     |
| Upload          | Multer + disco local                   |
| API docs        | Swagger/OpenAPI                        |

---

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- Chave de API da OpenAI (obrigatória para embeddings e chat)

---

## Instalação e execução local

### 1. Clonar e instalar dependências

```bash
git clone <repo>
cd legal-ai
npm install
```

### 2. Configurar variáveis de ambiente

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env.local
```

Edite `apps/api/.env` e preencha:
- `OPENAI_API_KEY` — obrigatória
- `JWT_SECRET` — troque por valor seguro
- `JWT_REFRESH_SECRET` — troque por valor seguro

### 3. Subir o banco de dados

```bash
docker compose up postgres redis -d
```

Aguarde o healthcheck passar (~10s).

### 4. Executar migrations e seed

```bash
cd apps/api

# Gerar client Prisma
npx prisma generate

# Executar a migration SQL
npx prisma db push
# ou
npx prisma migrate dev --name init

# Seed: criar usuário admin
npx ts-node prisma/seed.ts
```

### 5. Iniciar os servidores

```bash
# Na raiz do projeto — inicia API e Web juntos
npm run dev

# Ou separadamente:
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:3000
```

---

## Credenciais padrão

Após o seed:

| Perfil | E-mail                  | Senha          |
|--------|-------------------------|----------------|
| Admin  | admin@legalai.com.br    | Admin@123456   |
| Demo   | demo@legalai.com.br     | Demo@123456    |

---

## Rotas da aplicação

| Rota                           | Descrição                              |
|--------------------------------|----------------------------------------|
| `/`                            | Landing page                           |
| `/login`                       | Login                                  |
| `/dashboard`                   | Painel principal com estatísticas      |
| `/dashboard/chat`              | Chat jurídico com IA                   |
| `/dashboard/jurisprudencias`   | Listagem e busca de documentos         |
| `/dashboard/upload`            | Upload manual de jurisprudências (admin)|
| `/dashboard/fontes`            | Fontes automáticas de ingestão (admin) |
| `/dashboard/ingestoes`         | Histórico de jobs de ingestão (admin)  |
| `/dashboard/api`               | Gerenciar API Keys                     |
| `/dashboard/configuracoes`     | Configurações e usuários (admin)       |

---

## API REST

Base URL: `http://localhost:3001/api/v1`

Swagger UI: `http://localhost:3001/api/docs`

### Endpoints principais

#### Auth
```
POST /auth/login          — Login (retorna access + refresh token)
POST /auth/refresh         — Renovar access token
POST /auth/logout          — Encerrar sessão
GET  /auth/me              — Dados do usuário autenticado
```

#### Documents
```
GET    /documents          — Listar jurisprudências (paginado, com filtros)
GET    /documents/stats    — Estatísticas da base
GET    /documents/:id      — Detalhe de documento
DELETE /documents/:id      — Excluir (admin)
```

#### Uploads
```
POST /uploads              — Upload de arquivo + metadados (admin)
POST /uploads/:id/reindex  — Reindexar documento (admin)
```

#### Chat
```
POST /chat/message                    — Enviar mensagem (RAG)
GET  /chat/sessions                   — Listar sessões do usuário
GET  /chat/sessions/:sessionId        — Mensagens de uma sessão
DELETE /chat/sessions/:sessionId      — Encerrar sessão
```

#### Fontes Automáticas
```
POST   /sources                       — Criar fonte (admin)
GET    /sources                       — Listar fontes (admin)
GET    /sources/:id                   — Detalhar fonte (admin)
PATCH  /sources/:id                   — Atualizar fonte (admin)
DELETE /sources/:id                   — Remover fonte (admin)
GET    /sources/:id/jobs              — Jobs de uma fonte (admin)
```

#### Ingestão
```
POST /ingestion/sources/:id/run       — Executar ingestão manual (admin)
GET  /ingestion/jobs                  — Histórico de jobs (admin)
GET  /ingestion/jobs/:id              — Detalhe de job (admin)
```

#### API Keys
```
POST   /api-keys                      — Criar API Key
GET    /api-keys                      — Listar API Keys
DELETE /api-keys/:id                  — Revogar API Key
```

#### Health
```
GET /health                           — Health check da API
```

---

## Ingestão automática — como configurar

### 1. Criar uma fonte no painel
Acesse `/dashboard/fontes` e clique em **Nova Fonte**.

Campos obrigatórios:
- **Nome** — identificação amigável da fonte
- **Tipo de coletor** — `html-list` (padrão), `sitemap`, `rss`
- **URL base** — URL principal da fonte

Campos opcionais (para `html-list`):
- **Seletor de links (CSS)** — ex: `a.resultado-ementa`
- **Seletor de conteúdo (CSS)** — ex: `.texto-ementa`
- **Máximo de páginas** — padrão 3

### 2. Testar manualmente
Clique no botão **▶ Executar** na linha da fonte. A ingestão ocorre em background.
Acompanhe o progresso em `/dashboard/ingestoes`.

### 3. Agendamento automático
O scheduler registra um cron job para cada fonte ativa ao iniciar a API.
Expressões cron disponíveis:
- `0 2 * * *` — diário às 2h
- `0 */6 * * *` — a cada 6 horas
- `0 3 * * 0` — semanal aos domingos

### 4. Controle de duplicidade
O sistema evita reindexar o mesmo conteúdo usando:
1. URL do documento (identificador externo)
2. Hash SHA-256 do conteúdo

---

## Como testar o upload

1. Acesse `/dashboard/upload` com conta admin
2. Arraste um PDF de jurisprudência
3. Preencha o título (obrigatório) e demais metadados
4. Ative "Extrair metadados automaticamente" para usar IA
5. Clique em "Fazer upload e indexar"
6. Acompanhe o status em `/dashboard/jurisprudencias`

O processamento é assíncrono. Status evolui: `PENDING → CHUNKING → EMBEDDING → INDEXED`

---

## Como testar o chat

1. Aguarde ao menos um documento com status `INDEXED`
2. Acesse `/dashboard/chat`
3. Digite uma pergunta jurídica relacionada ao conteúdo indexado
4. A resposta virá com:
   - Resumo objetivo
   - Fundamentação jurídica
   - Fontes utilizadas (clique para expandir os trechos)
   - Nível de confiança

---

## Como rodar com Docker Compose completo

```bash
# Copiar e configurar .env na raiz
cp .env.example .env
# Editar OPENAI_API_KEY e secrets

# Build e start de todos os serviços
docker compose up --build

# Em outro terminal, executar seed
docker compose exec api npx ts-node prisma/seed.ts
```

Acesse em: `http://localhost:3000`

---

## Trocar provider de IA

No `.env`:

```bash
# Para usar Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Para usar OpenAI (padrão)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

> Nota: Embeddings sempre usam OpenAI (Anthropic não oferece API de embeddings).
> O chat pode usar qualquer provider.

---

## Variáveis de ambiente

### API (`apps/api/.env`)

| Variável                   | Obrigatória | Descrição                              |
|----------------------------|-------------|----------------------------------------|
| `DATABASE_URL`             | Sim         | Connection string PostgreSQL           |
| `JWT_SECRET`               | Sim         | Secret para JWT (mín. 32 chars)        |
| `JWT_REFRESH_SECRET`       | Sim         | Secret para refresh token              |
| `OPENAI_API_KEY`           | Sim*        | Chave OpenAI (*sempre necessária para embeddings) |
| `AI_PROVIDER`              | Não         | `openai` ou `anthropic` (padrão: openai) |
| `ANTHROPIC_API_KEY`        | Não         | Chave Anthropic (se provider=anthropic) |
| `UPLOAD_DIR`               | Não         | Diretório de uploads (padrão: ./uploads) |
| `MAX_FILE_SIZE_MB`         | Não         | Limite de upload em MB (padrão: 50)    |

### Web (`apps/web/.env.local`)

| Variável                | Descrição                         |
|-------------------------|-----------------------------------|
| `NEXT_PUBLIC_API_URL`   | URL da API (padrão: localhost:3001) |

---

## Arquitetura do RAG em detalhe

### Pipeline de indexação

```
Arquivo (PDF/DOCX/TXT)
  → Extração de texto (pdf-parse / mammoth)
  → Limpeza e normalização
  → [Opcional] Extração de metadados via IA
  → Chunking por parágrafos com overlap configurável
     (padrão: chunks de 1000 chars, overlap de 200)
  → Geração de embeddings em lote (OpenAI API)
  → Armazenamento no PostgreSQL + pgvector
     (índice HNSW para busca rápida)
```

### Pipeline de consulta

```
Pergunta do usuário
  → Embedding da query (mesmo modelo dos chunks)
  → Busca vetorial por distância de cosseno (pgvector)
     (top-K = 5, threshold de similaridade = 0.7)
  → Montagem de contexto com os chunks recuperados
  → Prompt estruturado para resposta jurídica
  → Geração pelo LLM (GPT-4o ou Claude)
  → Resposta com referências, fontes e nível de confiança
```

### Nível de confiança

| Nível  | Critério                                    |
|--------|---------------------------------------------|
| Alto   | similaridade média ≥ 88% e ≥ 3 chunks       |
| Médio  | similaridade média ≥ 78% e ≥ 2 chunks       |
| Baixo  | abaixo dos limiares acima                   |
| Nenhum | nenhum chunk recuperado (threshold não atingido) |

---

## Limitações atuais (MVP)

1. **Processamento síncrono**: o embedding é feito no mesmo processo da API.
   Em produção, usar fila (BullMQ + Redis) para processamento assíncrono.

2. **Storage local**: arquivos salvos em disco. Em produção, usar S3 ou similar.

3. **Sem OCR**: não processa PDFs escaneados sem camada de texto.

4. **Sem streaming**: resposta do chat entregue completa, não em stream.

5. **Multi-tenant não implementado**: base única, sem isolamento por escritório.

6. **Rate limiting básico**: Throttler do NestJS, não distribuído.

---

## Próximos passos para produção

- [ ] Fila de processamento assíncrono com BullMQ + Redis
- [ ] Storage S3 para arquivos enviados
- [ ] OCR para PDFs escaneados (Tesseract ou serviço externo)
- [ ] Streaming de respostas (SSE ou WebSocket)
- [ ] Multi-tenant com isolamento por escritório
- [ ] Ingestão automática semanal de jurisprudências (tribunais)
- [ ] Re-ranking dos chunks recuperados (Cohere Rerank ou cross-encoder)
- [ ] Cache de respostas frequentes (Redis)
- [ ] Versionamento de embeddings (migração ao mudar modelo)
- [ ] Observabilidade completa (OpenTelemetry, Sentry)
- [ ] Analytics de uso (perguntas mais feitas, documentos mais citados)
- [ ] Plano por escritório com billing

---

## Estrutura de pastas completa

```
apps/api/src/
├── main.ts                      # Bootstrap da aplicação
├── app.module.ts                # Módulo raiz
├── config/
│   ├── app.config.ts            # Configurações centralizadas
│   └── logger.config.ts         # Winston logger
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── interceptors/
│       └── logging.interceptor.ts
└── modules/
    ├── auth/                    # JWT, guards, strategies
    ├── users/                   # CRUD de usuários
    ├── documents/               # Listagem e gestão de jurisprudências
    ├── uploads/                 # Upload e pipeline de processamento
    │   └── processors/          # PDF, DOCX, TXT parsers
    ├── rag/                     # Pipeline RAG completo
    │   ├── providers/           # OpenAI, Anthropic (interface comum)
    │   ├── prompts/             # Prompts jurídicos centralizados
    │   ├── chunking.service.ts
    │   ├── embeddings.service.ts
    │   ├── vector-search.service.ts
    │   └── rag.service.ts
    └── chat/                    # Sessões e mensagens de chat

apps/web/src/
├── app/                         # App Router Next.js
│   ├── layout.tsx
│   ├── page.tsx                 # Landing page
│   ├── login/
│   └── dashboard/
│       ├── layout.tsx           # Layout com sidebar + header
│       ├── page.tsx             # Painel com estatísticas
│       ├── chat/                # Interface de chat
│       ├── jurisprudencias/     # Listagem de documentos
│       ├── upload/              # Upload com drag-and-drop
│       └── configuracoes/       # Config e gestão de usuários
├── components/
│   ├── layout/                  # Sidebar, Header
│   └── chat/                    # Bubbles, sources, disclaimer
├── lib/
│   ├── api-client.ts            # Axios com interceptors e refresh automático
│   ├── auth.ts                  # Funções de autenticação client-side
│   └── utils.ts                 # Helpers de formatação
└── types/index.ts               # Tipos TypeScript compartilhados
```
