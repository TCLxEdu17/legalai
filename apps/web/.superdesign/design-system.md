# LegalAI Design System

## Design Direction

**Goal:** Transform the UI from "clearly AI-generated" to a polished, premium legal software product.

### Core principles
1. **Professional restraint** — Fewer animations, no gratuitous effects. Motion only when it helps.
2. **Information density** — Lawyers are power users. Show more, scroll less.
3. **Editorial typography** — Let type hierarchy do the heavy lifting instead of glows.
4. **Authentic depth** — Subtle shadows and borders, not blur/glass overuse.
5. **Confidence** — A tool that feels authoritative, like Figma or Linear.

---

## New Color Direction

### Shift away from
- Bright blue-indigo `#6280fd` / `#2535ea` as primary — too "AI startup blue"
- Heavy glow effects and neon-ish accents
- Multiple accent colors competing (violet, emerald, amber badges everywhere)

### New palette (proposed)
Inspired by: Linear, Notion, Pitch — neutral-first with one clean accent

```
Primary accent: #1a56db  (slightly warmer, deeper blue — trustworthy, legal)
  hover: #1648c6
  light: #3b82f6
  muted bg: rgba(26, 86, 219, 0.08)
  border: rgba(26, 86, 219, 0.25)

Neutral backgrounds:
  page bg:    #0c0c0e   (slightly cooler, less pure-black — more refined)
  card bg:    #111113   (subtle separation from bg)
  card hover: #16161a
  sidebar:    #0c0c0e
  header:     rgba(12,12,14,0.9) backdrop-blur

Borders:
  default: rgba(255,255,255,0.07)
  hover:   rgba(255,255,255,0.12)
  focus:   rgba(26, 86, 219, 0.4)

Text:
  primary:   #f1f1f3   (off-white, not pure white)
  secondary: #9a9aa5
  muted:     #5e5e6b
  disabled:  #3a3a45

Semantic:
  success: #16a34a  (green — unchanged)
  danger:  #dc2626  (red — unchanged)
  warning: #d97706  (amber — unchanged)
```

### Badge simplification
- Remove 4-color badge system
- NEW badges: only `accent` (blue) and `muted` (neutral)
- PRO badge: neutral `bg-white/8 text-white/60 border border-white/10`
- New badge: `bg-accent-muted text-accent border border-accent-border`

---

## Typography

```
Font: Inter (existing) — keep, it's excellent
Scale:
  page title:    text-xl font-semibold (20px/600)
  section title: text-base font-semibold (16px/600)
  body:          text-sm (14px/400)
  label:         text-xs font-medium uppercase tracking-wide (11px/500)
  caption:       text-xs (12px/400) text-muted

Remove: text-[10px] tracking-widest for nav group labels → text-xs tracking-wide instead
```

---

## Spacing & Radius

```
Card padding:   p-5 (20px) — was p-6 (24px), tighter feels more refined
Border radius:  rounded-xl (12px) for cards, rounded-lg (8px) for inputs/buttons
Gap in lists:   space-y-2 between items (was space-y-1 — more breathing room)
Page padding:   p-6 (24px) sm → matches current, keep
```

---

## Component Refinements

### Sidebar
- Remove gradient top overlay (`from-brand-600/5`) — not needed
- Group labels: `text-xs` (was `text-[10px]`), tracking-wide (not widest)
- Active item: solid left-border instead of background highlight
  ```
  active: border-l-2 border-accent pl-[10px] text-white bg-transparent
  inactive: pl-3 text-muted hover:text-primary hover:bg-white/[0.04]
  ```

### Cards
- Remove `.dark-card::after` light-sweep animation — too "AI"
- Simple border + bg, optional subtle shadow
- `bg-[#111113] border border-white/[0.07] rounded-xl`
- Hover: `border-white/[0.12]` transition

### Buttons
- Primary: `bg-[#1a56db] hover:bg-[#1648c6] text-white rounded-lg px-4 py-2 text-sm font-medium`
- Secondary: `bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] rounded-lg`
- Ghost: `text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg`

### Inputs
- `bg-transparent border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-200`
- Focus: `border-[#1a56db]/50 ring-1 ring-[#1a56db]/20 outline-none`

---

## Remove / Reduce

| Element | Action |
|---------|--------|
| `.dark-card` light-sweep `::after` animation | Remove |
| `body::before` aurora radial gradient overlay | Remove (subtle, keep only subtle vignette) |
| Neon ring colors in PlanetLoader | Tone down → single brand blue |
| `.gradient-button` on landing page | Keep (CTA usage only) |
| Green `.glow-pulse` animation | Remove |
| Excessive badge color variety | Simplify to 2 variants |
| `bg-brand-600/15` active card states | Replace with subtle border |

---

## Keep

- Dark-first theme (no forced light mode changes)
- Framer Motion for page transitions and list entrances (FadeIn, StaggerItem)
- PlanetLoader (distinctive, brand-associated)
- Compact scrollbar styling
- `prose-legal` class for AI chat output
