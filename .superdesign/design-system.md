# Design System — LegalAI

## Product
Legal AI assistant for Brazilian lawyers. Dashboard SaaS. Dark-first, professional, premium.

## Colors (dark theme, default)
- Background: `#0a0a0a`
- Card bg: `#141414` / `#111111`
- Border: `rgba(255,255,255,0.07)` normal, `rgba(255,255,255,0.12)` hover
- Brand primary: `#2535ea` (brand-600), `#6280fd` (brand-400), `#3b55f5` (brand-500)
- Brand light bg: `bg-brand-600/10`, `bg-brand-600/15`, `bg-brand-600/20`
- Text primary: `text-slate-100` (#f0f0f0)
- Text secondary: `text-slate-400`, `text-slate-500`
- Text muted: `text-slate-600`, `text-slate-700`
- Emerald: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` — success/active states
- Red: `bg-red-500/10 text-red-400 border-red-500/20` — errors/danger
- Amber: `bg-amber-500/15 text-amber-400 border-amber-500/20` — warnings
- Purple: `bg-purple-500/10 text-purple-400 border-purple-500/20` — secondary accent

## Typography
- Font: Inter (sans-serif)
- Page title: `text-2xl font-bold text-slate-100`
- Page subtitle: `text-slate-500 text-sm mt-1`
- Card title: `font-semibold text-slate-100 text-sm`
- Label: `text-xs text-slate-500`
- Mono values: `font-mono`

## Spacing & Layout
- Page wrapper: `max-w-4xl mx-auto space-y-6`
- Card padding: `p-5`
- Section gap: `space-y-4` or `gap-4`
- Grid: `grid md:grid-cols-2 gap-4`

## Border Radius
- Cards: `rounded-xl` (12px) or `rounded-2xl` (16px)
- Inputs: `rounded-lg` (8px)
- Badges: `rounded-full`
- Buttons: `rounded-lg` or `rounded-xl`

## Cards
- Standard dark card: `bg-[#141414] border border-white/[0.07] rounded-xl p-5`
- Inner dividers: `border-t border-white/[0.05]`
- Hover: `hover:border-white/[0.12] transition-colors`
- With brand glow: `border-brand-500/30 hover:border-brand-500/40`

## Inputs
```css
w-full px-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg font-mono
placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500
```

## Buttons
- Primary: `px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors`
- Secondary: `px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-sm transition-colors`
- Ghost: `px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-xs transition-colors`
- Danger: `px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors`

## Badges
- Brand: `text-xs px-2.5 py-1 bg-brand-600/10 text-brand-400 rounded-full border border-brand-500/20`
- Emerald: `text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/30`
- Slate: `text-xs px-2.5 py-1 bg-slate-500/15 text-slate-400 rounded-full font-medium`
- PRO badge: `text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 font-semibold`

## Icons
- Icon containers: `w-9 h-9 bg-brand-600/10 border border-brand-500/15 rounded-lg flex items-center justify-center`
- Icon size: `w-4 h-4 text-brand-400`

## Tab Switcher
```tsx
<div className="flex gap-1 bg-[#141414] border border-white/[0.07] rounded-xl p-1">
  <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-brand-600/20 text-brand-400">Active</button>
  <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-500 hover:text-slate-300">Inactive</button>
</div>
```

## Icon Source
Use Lucide icons: Search, Lock, Shield, Key, Eye, EyeOff, Gavel, Scale, Clock, AlertCircle, CheckCircle2, ChevronRight, Trash2, BookmarkPlus, Bell, Star, Zap, Crown

## PRO Feature Pattern
- Lock overlay on disabled sections: semi-transparent with lock icon centered
- PRO badge: amber color scheme
- Upgrade CTA: gradient banner `bg-gradient-to-r from-amber-600/10 via-[#141414] to-amber-600/10 border border-amber-500/20 rounded-xl p-5`

## Page Header Pattern
```tsx
<div className="flex items-start justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
      <Icon className="w-6 h-6 text-brand-400" />
      Page Title
    </h1>
    <p className="text-slate-500 text-sm mt-1">Subtitle</p>
  </div>
  {/* right side: tabs or actions */}
</div>
```
