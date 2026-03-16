# Components — LegalAI

## Motion Components
File: `apps/web/src/components/ui/motion.tsx`

```tsx
// FadeIn — fade + translateY on mount
export function FadeIn({ children, delay = 0, duration = 0.4, className, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >{children}</motion.div>
  );
}

// ScrollReveal — fade on viewport enter
export function ScrollReveal({ children, delay = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >{children}</motion.div>
  );
}

// InteractiveCard — scale+y on hover/tap
export function InteractiveCard({ children, className, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      onClick={onClick}
    >{children}</motion.div>
  );
}

// StaggerContainer + StaggerItem — staggered children reveal
export function StaggerContainer({ children, className, staggerDelay = 0.05 }) { ... }
export function StaggerItem({ children, className }) { ... }

// Parallax — y offset on scroll
export function Parallax({ children, offset = 30, className }) { ... }

// PulseOnMount — spring scale from 0.9
export function PulseOnMount({ children, className }) { ... }

// AnimatedNumber — count-up with fade
export function AnimatedNumber({ value, className }) { ... }
```

## Card Patterns

### Dark Card (`.dark-card`)
```tsx
<div className="dark-card rounded-xl p-4 hover:border-white/[0.12] transition-colors">
  {/* bg-[#141414] border border-white/0.07, light-sweep animation */}
</div>
```

### Feature Card
```tsx
<div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
  <div className="w-9 h-9 bg-brand-600/10 border border-brand-500/15 rounded-lg flex items-center justify-center mb-3">
    <Icon className="w-4 h-4 text-brand-400" />
  </div>
  <h3 className="font-semibold text-slate-100 text-sm mb-1">{title}</h3>
  <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
</div>
```

### Stat Card
```tsx
<InteractiveCard className="dark-card rounded-xl p-4 hover:border-white/[0.12] transition-colors">
  <div className="flex items-center justify-between mb-3">
    <p className="text-slate-500 text-xs font-medium">{label}</p>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-600/15">
      <Icon className="w-4 h-4 text-brand-400" />
    </div>
  </div>
  <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
  <p className="text-xs text-slate-500 mt-1">{sub}</p>
</InteractiveCard>
```

### Quick Action Card
```tsx
<Link href={href} className="group bg-[#141414] border border-white/[0.07] rounded-xl p-5 hover:border-brand-500/30 hover:bg-white/[0.04] transition-all">
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-200 mb-1 group-hover:text-brand-400 transition-colors">{title}</p>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 shrink-0 mt-0.5 transition-colors" />
  </div>
</Link>
```

## Buttons

### Primary Button
```tsx
<button className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors">
  Label
</button>
```

### Secondary Button
```tsx
<button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-xs transition-colors">
  Label
</button>
```

## Badges

### Live Badge
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-medium text-emerald-400">
  <span className="relative flex w-2 h-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
    <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
  </span>
  Base atualizando diariamente
</span>
```

### Tag Badge
```tsx
<span className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600/10 border border-brand-500/20 rounded-full text-brand-400 text-xs font-medium">
  <Zap className="w-3 h-3" />
  Busca Semântica · IA Jurídica · RAG
</span>
```

## Form Inputs (Login page style)
```tsx
<input
  className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
             placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
/>
```

## Logo Mark
```tsx
<div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
  <Scale className="w-4 h-4 text-brand-400" />
</div>
```

## Gradient Banner
```tsx
<div className="bg-gradient-to-r from-brand-600/10 via-[#141414] to-violet-600/10 border border-brand-500/20 rounded-xl p-5">
  ...
</div>
```

## Progress Bar (ThemeBar)
```tsx
<div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
  <div className="h-full rounded-full transition-all duration-700 ease-out bg-brand-500" style={{ width: `${pct}%` }} />
</div>
```
