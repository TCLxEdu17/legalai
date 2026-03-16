# Routes — LegalAI (Next.js App Router)

## Public Routes
| URL | File | Layout |
|-----|------|--------|
| `/` | `apps/web/src/app/page.tsx` | Root layout |
| `/login` | `apps/web/src/app/login/page.tsx` | Root layout |
| `/trial` | `apps/web/src/app/trial/page.tsx` | Root layout |
| `/trial/onboarding` | `apps/web/src/app/trial/onboarding/page.tsx` | Root layout |
| `/status` | `apps/web/src/app/status/page.tsx` | Root layout |

## Dashboard Routes (authenticated, uses DashboardLayout)
| URL | File |
|-----|------|
| `/dashboard` | `apps/web/src/app/dashboard/page.tsx` |
| `/dashboard/chat` | `apps/web/src/app/dashboard/chat/page.tsx` |
| `/dashboard/casos` | `apps/web/src/app/dashboard/casos/page.tsx` |
| `/dashboard/casos/[id]` | `apps/web/src/app/dashboard/casos/[id]/page.tsx` |
| `/dashboard/copiloto` | `apps/web/src/app/dashboard/copiloto/page.tsx` |
| `/dashboard/jurisprudencias` | `apps/web/src/app/dashboard/jurisprudencias/page.tsx` |
| `/dashboard/upload` | `apps/web/src/app/dashboard/upload/page.tsx` |
| `/dashboard/fontes` | `apps/web/src/app/dashboard/fontes/page.tsx` |
| `/dashboard/ingestoes` | `apps/web/src/app/dashboard/ingestoes/page.tsx` |
| `/dashboard/api` | `apps/web/src/app/dashboard/api/page.tsx` |
| `/dashboard/configuracoes` | `apps/web/src/app/dashboard/configuracoes/page.tsx` |
| `/dashboard/analise` | `apps/web/src/app/dashboard/analise/page.tsx` |
| `/dashboard/predicao` | `apps/web/src/app/dashboard/predicao/page.tsx` |
| `/dashboard/revisor` | `apps/web/src/app/dashboard/revisor/page.tsx` |
| `/dashboard/minutas` | `apps/web/src/app/dashboard/minutas/page.tsx` |
| `/dashboard/calculadora` | `apps/web/src/app/dashboard/calculadora/page.tsx` |
| `/dashboard/prazos` | `apps/web/src/app/dashboard/prazos/page.tsx` |
| `/dashboard/agenda` | `apps/web/src/app/dashboard/agenda/page.tsx` |
| `/dashboard/clientes` | `apps/web/src/app/dashboard/clientes/page.tsx` |
| `/dashboard/processos` | `apps/web/src/app/dashboard/processos/page.tsx` |
| `/dashboard/comparador` | `apps/web/src/app/dashboard/comparador/page.tsx` |
| `/dashboard/contratos` | `apps/web/src/app/dashboard/contratos/page.tsx` |
| `/dashboard/financeiro` | `apps/web/src/app/dashboard/financeiro/page.tsx` |
| `/dashboard/tarefas` | `apps/web/src/app/dashboard/tarefas/page.tsx` |
| `/dashboard/procuracoes` | `apps/web/src/app/dashboard/procuracoes/page.tsx` |
| `/dashboard/relatorio` | `apps/web/src/app/dashboard/relatorio/page.tsx` |
| `/dashboard/favoritos` | `apps/web/src/app/dashboard/favoritos/page.tsx` |
| `/dashboard/planos` | `apps/web/src/app/dashboard/planos/page.tsx` |
| `/dashboard/notas` | `apps/web/src/app/dashboard/notas/page.tsx` |
| `/dashboard/metricas` | `apps/web/src/app/dashboard/metricas/page.tsx` |
| `/dashboard/dicionario` | `apps/web/src/app/dashboard/dicionario/page.tsx` |
| `/dashboard/admin/flags` | `apps/web/src/app/dashboard/admin/flags/page.tsx` |

## Dashboard Layout
File: `apps/web/src/app/dashboard/layout.tsx`
- Wraps all `/dashboard/*` routes
- Renders `<Sidebar>` + `<Header>` + `<main>`
- Auth check + session timeout (2h)
- Offline banner
- `<TrialCountdown>`, `<DollarTicker>`, `<CookieBanner>`
