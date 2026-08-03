# Routes — LegalAI

## Route Structure

All routes live under `src/app/`. Dashboard routes use `src/app/dashboard/layout.tsx`.

### Public Routes
| Path | File | Description |
|------|------|-------------|
| `/` | `src/app/page.tsx` | Landing page |
| `/login` | `src/app/login/page.tsx` | Login |
| `/cadastro` | `src/app/cadastro/page.tsx` | Register |
| `/trial` | `src/app/trial/page.tsx` | Trial signup |
| `/trial/[id]` | `src/app/trial/[id]/page.tsx` | Trial status |
| `/politica-de-privacidade` | `src/app/politica-de-privacidade/page.tsx` | Privacy |
| `/termos-de-uso` | `src/app/termos-de-uso/page.tsx` | Terms |

### Dashboard Routes (all use DashboardLayout)
| Path | File | Description |
|------|------|-------------|
| `/dashboard` | `src/app/dashboard/page.tsx` | Main dashboard (weather, news, checklist) |
| `/dashboard/funcionalidades` | `.../funcionalidades/page.tsx` | Feature catalog |
| `/dashboard/copiloto` | `.../copiloto/page.tsx` | Augustus AI copilot |
| `/dashboard/chat` | `.../chat/page.tsx` | Lexis chat |
| `/dashboard/analise` | `.../analise/page.tsx` | Document analysis |
| `/dashboard/predicao` | `.../predicao/page.tsx` | Predictive analysis |
| `/dashboard/revisor` | `.../revisor/page.tsx` | Document reviewer |
| `/dashboard/minutas` | `.../minutas/page.tsx` | Draft generator |
| `/dashboard/jurisprudencias` | `.../jurisprudencias/page.tsx` | Jurisprudence library |
| `/dashboard/processos` | `.../processos/page.tsx` | Public processes |
| `/dashboard/processos-privados` | `.../processos-privados/page.tsx` | Private processes (PRO) |
| `/dashboard/processos-por-oab` | `.../processos-por-oab/page.tsx` | Processes by OAB number (PRO) |
| `/dashboard/consultas` | `.../consultas/page.tsx` | CEP/CNPJ lookups |
| `/dashboard/comparador` | `.../comparador/page.tsx` | Decision comparator |
| `/dashboard/casos` | `.../casos/page.tsx` | Case list |
| `/dashboard/casos/[id]` | `.../casos/[id]/page.tsx` | Case detail (tabs: chat, documentos, pecas, analise, audiencia, acordo) |
| `/dashboard/radares` | `.../radares/page.tsx` | Jurisprudence radar list |
| `/dashboard/radares/[id]` | `.../radares/[id]/page.tsx` | Radar detail (tabs: alertas, configurações) |
| `/dashboard/calculadora` | `.../calculadora/page.tsx` | Fee calculator |
| `/dashboard/atualizacao` | `.../atualizacao/page.tsx` | Monetary update |
| `/dashboard/prazos` | `.../prazos/page.tsx` | Procedural deadlines |
| `/dashboard/dicionario` | `.../dicionario/page.tsx` | Legal dictionary |
| `/dashboard/notas` | `.../notas/page.tsx` | Notes pad |
| `/dashboard/contratos` | `.../contratos/page.tsx` | Fee contracts |
| `/dashboard/financeiro` | `.../financeiro/page.tsx` | Financial |
| `/dashboard/tarefas` | `.../tarefas/page.tsx` | Tasks/diligences |
| `/dashboard/procuracoes` | `.../procuracoes/page.tsx` | Powers of attorney |
| `/dashboard/agenda` | `.../agenda/page.tsx` | Hearing schedule |
| `/dashboard/clientes` | `.../clientes/page.tsx` | Clients |
| `/dashboard/relatorio` | `.../relatorio/page.tsx` | Monthly report |
| `/dashboard/favoritos` | `.../favoritos/page.tsx` | Favorites |
| `/dashboard/planos` | `.../planos/page.tsx` | Plans & usage |
| `/dashboard/upload` | `.../upload/page.tsx` | Manual upload (admin) |
| `/dashboard/fontes` | `.../fontes/page.tsx` | Auto sources (admin) |
| `/dashboard/ingestoes` | `.../ingestoes/page.tsx` | Ingestion history (admin) |
| `/dashboard/metricas` | `.../metricas/page.tsx` | Metrics (admin) |
| `/dashboard/api` | `.../api/page.tsx` | API keys (admin) |
| `/dashboard/admin/flags` | `.../admin/flags/page.tsx` | Feature flags (admin) |
| `/dashboard/configuracoes` | `.../configuracoes/page.tsx` | Settings (admin) |
