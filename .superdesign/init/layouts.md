# Layouts — LegalAI

## Root Layout
File: `apps/web/src/app/layout.tsx`
- Providers (QueryClient, ThemeProvider, Sonner)
- Inter font from Google
- Dark mode default

## Dashboard Layout
File: `apps/web/src/app/dashboard/layout.tsx`

```tsx
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
            Você está offline — algumas funcionalidades podem estar indisponíveis
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

## Sidebar Component
File: `apps/web/src/components/layout/sidebar.tsx`

```tsx
// Desktop: w-60 expanded / w-16 collapsed, bg-[#0a0a0a], border-r border-white/[0.06]
// Mobile: fixed overlay w-72, bg-black/60 backdrop-blur-sm backdrop
// Logo: Scale icon, brand-600/20 bg, LegalAI text
// Nav groups: Painel | IA & Casos | Pesquisa | Ferramentas | Gestão | Conta | Admin
// Active item: bg-brand-600/15 text-brand-400 border border-brand-500/20
// Inactive: text-slate-500 hover:text-slate-200 hover:bg-white/5
// Badges: emerald-500/20 bg, emerald-400 text (e.g. "New!")
// Collapse toggle: PanelLeftClose/PanelLeftOpen icons

<aside className="hidden lg:flex flex-col bg-[#0a0a0a] border-r border-white/[0.06] shrink-0 relative transition-all duration-200 w-60">
  {/* Subtle glow */}
  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand-600/5 to-transparent pointer-events-none" />
  {/* Logo */}
  <div className="border-b border-white/[0.06] flex items-center justify-between p-5">
    <Link href="/dashboard" className="flex items-center gap-3">
      <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
        <Scale className="w-4 h-4 text-brand-400" />
      </div>
      <div>
        <p className="text-slate-100 font-semibold text-sm">LegalAI</p>
        <p className="text-slate-600 text-xs">Assistente Jurídico</p>
      </div>
    </Link>
  </div>
  {/* Nav */}
  <nav className="flex-1 p-2 overflow-y-auto space-y-1">
    {/* group labels: text-[10px] font-semibold uppercase tracking-widest text-slate-700 */}
    {/* active link: bg-brand-600/15 text-brand-400 border border-brand-500/20 */}
    {/* inactive link: text-slate-500 hover:text-slate-200 hover:bg-white/5 */}
  </nav>
  <div className="p-4 border-t border-white/[0.06]">
    <p className="text-slate-700 text-xs text-center">v1.8.0</p>
  </div>
</aside>
```

## Header Component
File: `apps/web/src/components/layout/header.tsx`

```tsx
<header className="h-14 bg-[#101010]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-20">
  {/* Left: hamburger (mobile) */}
  <div className="flex items-center gap-2">
    <button className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400">
      <Menu className="w-5 h-5" />
    </button>
  </div>
  {/* Right: theme toggle + notifications bell + user menu */}
  <div className="flex items-center gap-1 sm:gap-2">
    {/* Sun/Moon toggle */}
    {/* Bell with unread badge */}
    {/* User avatar + name dropdown */}
  </div>
</header>
```
