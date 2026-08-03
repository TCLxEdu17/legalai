# LegalAI — Codex Instructions

Assistente jurídico com IA para escritórios de advocacia brasileiros.
Stack: Next.js (Vercel) · NestJS/FastAPI · PostgreSQL + Prisma · Stripe · Docker

---

## Contexto do Projeto

- **Frontend**: Next.js com Tailwind CSS, Framer Motion → deploy na Vercel
- **Backend**: NestJS (Node.js) → deploy no Render
- **Auth**: JWT com refresh token rotation
- **Billing**: Stripe
- **DB**: PostgreSQL via Prisma ORM + pgvector para busca semântica
- **RAG**: pgvector para jurisprudências indexadas (embeddings OpenAI text-embedding-3-small)
- **URLs**: https://legal.lasolutions.me · API: https://legalai-api-231f.onrender.com

---

## Arquitetura do Projeto

```
/Users/edu/rag/                     ← monorepo (npm workspaces)
├── apps/
│   ├── api/                        # NestJS backend (porta 3001)
│   │   ├── src/modules/            # auth, users, documents, rag, chat, cases, ingestion…
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── Dockerfile.api          # usado pelo Render (contexto: repo root)
│   └── web/                        # Next.js frontend (porta 3000)
│       ├── src/app/                # App Router
│       ├── src/components/ui/      # componentes reutilizáveis (shadcn pattern)
│       └── src/lib/                # api-client, utils, auth helpers
├── docker-compose.yml
└── package.json
```

---

## Convenções de Código

### Frontend (Next.js App Router)
- App Router **sempre** — nunca Pages Router
- Server Components por padrão; `"use client"` apenas quando necessário
- Tailwind CSS + `cn()` (clsx + twMerge) para classes condicionais
- Framer Motion para animações de layout e transições de página
- TanStack Query para data fetching; react-hook-form + zod para formulários
- Componentes em `/components/ui/` seguem padrão shadcn/ui

### Backend (NestJS)
- Módulos independentes em `src/modules/<nome>/`
- `@Optional()` + `@Inject()` para dependências opcionais (Redis, notificações)
- Fire-and-forget com `.catch(() => {})` apenas em side-effects não críticos
- Prisma para **todas** as operações SQL — nunca SQL raw exceto para pgvector
- Redis (`REDIS_CLIENT` global) para cache de dados quentes (TTL curto)

### Banco de Dados
- Migrations em `apps/api/prisma/migrations/` — sempre versionadas e idempotentes
- pgvector gerenciado via `$executeRaw` (limitação do Prisma ORM)
- HNSW index em tabelas de chunks para busca vetorial eficiente
- Deduplicação por SHA-256 hash de conteúdo

### Geral
- TypeScript strict no frontend e backend
- Commits semânticos: `feat:`, `fix:`, `chore:`, `refactor:`, `perf:`
- Nunca commitar credenciais — usar env vars em `~/.zshrc` ou `.env`
- `req.user.id` (não `req.user.userId`) — JWT strategy retorna `{ id, email, role, name }`

---

## Metodologia de Desenvolvimento

### Features novas complexas
1. Ler os arquivos relevantes antes de qualquer mudança
2. Entender o padrão existente no módulo (seguir convenções já estabelecidas)
3. Planejar: schema → service → controller → frontend
4. Implementar incrementalmente, verificando TypeScript a cada passo

### Debug
1. Reproduzir o erro com contexto completo (logs, stack trace)
2. Identificar causa raiz antes de qualquer fix
3. Corrigir na camada correta (não tratar sintoma)
4. Verificar se não há outros lugares com o mesmo bug

### Refatorações críticas (auth, billing, RAG pipeline)
- Ler todo o fluxo antes de tocar em qualquer arquivo
- Alterar um módulo por vez, nunca em paralelo
- Testar localmente antes de propor commit

### Tarefas mecânicas (CRUD, migrations, múltiplos endpoints)
- Seguir exatamente o padrão do módulo mais próximo existente
- Criar migration SQL idempotente (IF NOT EXISTS)
- Gerar Prisma client após qualquer mudança de schema

---

## Fluxo Git

```
develop  → staging (auto-deploy Render ao push)
main     → produção (merge manual após validação)

Merge:   git checkout main && git merge develop --no-ff && git push origin main --tags
Deploy:  "pau no gato"   → commit + push develop apenas
         "sobe pra main" → única frase que autoriza merge → produção
```

**Versionamento:** `v2.x.0` (minor bump a cada push/deploy relevante)

---

## Variáveis de Ambiente

```env
# Database
DATABASE_URL=            # PostgreSQL local ou Render
REDIS_URL=               # Redis local ou Render

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=

# AI
OPENAI_API_KEY=          # embeddings (sempre OpenAI, mesmo quando chat é Anthropic)
ANTHROPIC_API_KEY=       # Codex (AI_PROVIDER=anthropic)
AI_PROVIDER=             # "openai" | "anthropic"

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
CORS_ORIGINS=            # ex: https://legal.lasolutions.me
NODE_ENV=                # development | production
```

---

## Comandos Úteis

```bash
# Dev (rodar do root)
npm run dev                          # inicia api + web em paralelo
docker compose up postgres redis -d  # sobe serviços locais

# API
cd apps/api
npx prisma generate                  # regenera client após mudança de schema
npx prisma db push                   # aplica schema sem migration (dev only)
npx prisma migrate dev               # cria nova migration com diff automático
npx ts-node prisma/seed.ts           # popula dados iniciais

# Tipos
npx tsc --project apps/api/tsconfig.json --noEmit   # type-check API
npx tsc --project apps/web/tsconfig.json --noEmit   # type-check Web

# Deploy
npx vercel --token <token>           # frontend → Vercel
# backend → auto-deploy via push no branch configurado no Render
```

---

## Módulos Existentes (Backend)

| Módulo | Descrição |
|--------|-----------|
| `auth` | Login, refresh token rotation, logout |
| `users` | CRUD de usuários |
| `documents` | Upload + processamento de PDF/DOCX/TXT |
| `rag` | Embeddings, busca semântica, chat com fontes |
| `chat` | Sessões de chat com histórico |
| `cases` | Copiloto por processo (chat, documentos, peças) |
| `ingestion` | Pipeline automático de fontes externas |
| `sources` | CRUD de fontes externas (cached no Redis) |
| `scheduler` | CronJobs por fonte ativa (@nestjs/schedule) |
| `collectors` | HtmlList, Sitemap, RSS collectors |
| `analytics` | Tracking de eventos + predição jurídica |
| `metrics` | Token usage + custo por endpoint |
| `trial` | Usuários trial com geolocalização |
| `api-keys` | Chaves de API com hash argon2 |
| `notifications` | Notificações in-app |
| `webhooks` | Dispatch de eventos para URLs externas |
| `private-processos` | Processos restritos via credenciais OAB |

---

## Páginas Frontend

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login`, `/trial` | Auth público |
| `/dashboard` | Painel principal |
| `/dashboard/casos` | Lista de casos |
| `/dashboard/casos/[id]` | Detalhe: Chat / Documentos / Peças / Análise |
| `/dashboard/copiloto` | Augustus AI (copiloto geral) |
| `/dashboard/chat` | Lexis (assistente jurídico) |
| `/dashboard/jurisprudencias` | Busca semântica |
| `/dashboard/metricas` | Analytics admin (trials + tokens + engagement) |
| `/dashboard/fontes` | Fontes automáticas (admin) |
| `/dashboard/configuracoes` | Configurações (admin) |

## Imported Claude Cowork project instructions
