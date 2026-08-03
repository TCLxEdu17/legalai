# Pages — Dependency Trees

Each entry shows all files a page depends on. Use these as `--context-file` lists.

---

## Login Page (`/login`)

**Files:**
- `src/app/login/page.tsx` ← main page
- `src/components/ui/aurora-background.tsx` ← WebGL background
- `src/components/ui/planet-loader.tsx` ← loading state
- `src/lib/auth.ts` ← login() function
- `src/lib/utils.ts` ← extractApiErrorMessage
- `src/app/globals.css`
- `tailwind.config.ts`

**Layout:** None (standalone page, no sidebar/header)

---

## Dashboard Home (`/dashboard`)

**Files:**
- `src/app/dashboard/page.tsx` ← main page
- `src/app/dashboard/layout.tsx` ← dashboard layout
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/ui/planet-loader.tsx`
- `src/lib/api-client.ts`
- `src/lib/auth.ts`
- `src/lib/utils.ts`
- `src/app/globals.css`

**Content:** Greeting, weather widget, news ticker, daily checklist

---

## Jurisprudências (`/dashboard/jurisprudencias`)

**Files:**
- `src/app/dashboard/jurisprudencias/page.tsx` ← main
- `src/app/dashboard/layout.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/ui/planet-loader.tsx`
- `src/components/ui/motion.tsx` (FadeIn)
- `src/lib/api-client.ts`
- `src/lib/auth.ts`
- `src/lib/utils.ts`
- `src/types/index.ts`
- `src/app/globals.css`

**Content:** Search bar, paginated table, status badges, document detail modal, AI search (Sparkles)

---

## Casos List (`/dashboard/casos`)

**Files:**
- `src/app/dashboard/casos/page.tsx` ← main
- `src/app/dashboard/layout.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/ui/planet-loader.tsx`
- `src/lib/api-client.ts`
- `src/lib/utils.ts`
- `src/types/index.ts`
- `src/app/globals.css`

---

## Caso Detail (`/dashboard/casos/[id]`)

**Files:**
- `src/app/dashboard/casos/[id]/page.tsx` ← main
- `src/app/dashboard/layout.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/ui/planet-loader.tsx`
- `src/components/ui/motion.tsx`
- `src/lib/api-client.ts`
- `src/lib/utils.ts`
- `src/types/index.ts`
- `src/app/globals.css`

**Content:** Tabs — Chat com Autos, Documentos, Peças, Análise IA, Audiência, Acordo

---

## Radares List (`/dashboard/radares`)

**Files:**
- `src/app/dashboard/radares/page.tsx` ← main
- `src/app/dashboard/layout.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/ui/planet-loader.tsx`
- `src/lib/api-client.ts`
- `src/lib/utils.ts`
- `src/app/globals.css`

**Content:** Radar cards grid, search, create radar modal, isActive toggle, delete

---

## Radar Detail (`/dashboard/radares/[id]`)

**Files:**
- `src/app/dashboard/radares/[id]/page.tsx` ← main
- `src/app/dashboard/layout.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/ui/planet-loader.tsx`
- `src/lib/api-client.ts`
- `src/lib/utils.ts`
- `src/app/globals.css`

**Content:** Tabs — Alertas (match list with similarity %, summary, impact analysis), Configurações (edit form)
