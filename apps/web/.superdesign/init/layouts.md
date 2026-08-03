# Layouts — LegalAI

## Dashboard Layout
**File:** `src/app/dashboard/layout.tsx`
**Used by:** All `/dashboard/*` pages

```tsx
'use client';
// Full source: apps/web/src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <TrialCountdown />
        {isOffline && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/20 text-amber-400 text-xs shrink-0">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            Você está offline…
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">{children}</main>
        <DollarTicker />
      </div>
      <CookieBanner />
    </div>
  );
}
```

Layout structure:
- **Left column:** `<Sidebar>` — 56px collapsed, 240px expanded, animated via Framer Motion
- **Right column:** full-height flex column containing Header + main content scroll area
- **Header:** 56px (`h-14`) sticky top, blurred bg
- **Main:** `flex-1 overflow-y-auto p-4 sm:p-6`
- **Bottom bar:** `<DollarTicker>` (compact BRL/USD ticker strip)

---

## Sidebar Component
**File:** `src/components/layout/sidebar.tsx` (390 lines)

### Desktop behavior
- Collapsed: 56px wide (icons only)
- Expanded: 240px wide (hover to expand)
- Framer Motion `animate={{ width: open ? 240 : 56 }}`
- `onMouseEnter/Leave` toggles open state
- `bg-[#0a0a0a] border-r border-white/[0.06]`

### Mobile behavior
- Hidden on `lg+`
- Full-width slide-in from left, `w-64`
- Backdrop blur overlay
- Controlled via `mobileOpen` prop

### Nav groups (7 total)
1. **(root)** — Painel, Funcionalidades
2. **IA & Casos** — Meus Casos, Radar, Augustus AI, Lexis, Análise, Predição, Revisor, Minutas
3. **Pesquisa** — Jurisprudências, Processos, Processos Privados, Processos por OAB, Consultas, Comparador
4. **Ferramentas** — Calculadora, Atualização Monetária, Prazos, Dicionário, Notas
5. **Gestão** — Contratos, Financeiro, Tarefas, Procurações, Agenda, Clientes, Relatório
6. **Conta** — Favoritos, Planos e Uso
7. **Admin** — Upload, Fontes, Ingestões, Métricas, API & Chaves, Feature Flags, Configurações

### Full sidebar source
```tsx
// See: src/components/layout/sidebar.tsx
// Key classes:
// - Active item: 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
// - Inactive item: 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
// - Group label: 'text-[10px] font-semibold uppercase tracking-widest text-slate-700'
// - Logo container: 'h-[57px]' (must match header height h-14 = 56px)
// - Logo icon: 'w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg'
// - Footer: version label 'v2.3.4' text-slate-700 text-xs
```

---

## Header Component
**File:** `src/components/layout/header.tsx` (188 lines)

```tsx
// h-14 bg-[#101010]/80 backdrop-blur-md border-b border-white/[0.06]
// flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-20

// Left: hamburger menu button (mobile only, lg:hidden)
// Right: theme toggle | bell with badge | user avatar + name + chevron dropdown

// Theme toggle: Sun/Moon icon, w-8 h-8 rounded-lg hover:bg-white/5
// Bell: w-8 h-8, badge = red-500 circle top-right corner, count or '9+'
// Notification dropdown: w-80, bg-[#1a1a1a] border border-white/10 rounded-xl max-h-96
// User avatar: w-7 h-7 bg-brand-600/20 border border-brand-500/30 rounded-full
// User dropdown: w-44 bg-[#1a1a1a] border border-white/10 rounded-xl
```
