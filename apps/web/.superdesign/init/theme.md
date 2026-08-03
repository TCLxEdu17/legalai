# Theme — LegalAI Design System

## Tech Stack
- Framework: Next.js 14.2.5 (App Router)
- CSS: Tailwind CSS 3.4 + custom CSS in globals.css
- Animations: Framer Motion 11
- Component primitives: Radix UI (@radix-ui/react-slot)
- Fonts: Inter (sans-serif) via system stack
- Icons: Lucide React

---

## tailwind.config.ts

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          50: '#f0f4ff',
          100: '#dde6ff',
          200: '#c2d0ff',
          300: '#96aeff',
          400: '#6280fd',   // main accent — blue-indigo
          500: '#3b55f5',
          600: '#2535ea',   // active state
          700: '#1e27d2',
          800: '#1e24aa',
          900: '#1e2586',
          950: '#141659',
        },
        slate: {
          850: '#1a2235',
          950: '#0d1526',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
```

---

## CSS Variables (globals.css dark default)

```css
:root {
  --background: 0 0% 4%;          /* #0a0a0a */
  --foreground: 0 0% 91%;         /* ~#e8e8e8 */
  --card: 0 0% 6%;                /* ~#0f0f0f */
  --card-foreground: 0 0% 91%;
  --popover: 0 0% 7%;             /* ~#111 */
  --popover-foreground: 0 0% 91%;
  --primary: 228 96% 60%;         /* brand-400 #6280fd */
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 12%;          /* #1e1e1e */
  --secondary-foreground: 0 0% 75%;
  --muted: 0 0% 10%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 14%;
  --accent-foreground: 0 0% 85%;
  --destructive: 0 84% 60%;       /* red-500 */
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 12%;
  --input: 0 0% 12%;
  --ring: 228 96% 60%;
  --radius: 0.5rem;
}
```

---

## Key Hex Values (reference cheat-sheet)

| Token            | Hex       | Usage                         |
|------------------|-----------|-------------------------------|
| body bg          | `#0a0a0a` | Main background               |
| card/dark-card   | `#141414` | Card backgrounds              |
| header bg        | `#101010` | Header (80% opacity)          |
| sidebar bg       | `#0a0a0a` | Sidebar                       |
| popover/dropdown | `#1a1a1a` | Dropdowns, tooltips           |
| border subtle    | `rgba(255,255,255,0.06)` | Default border    |
| border hover     | `rgba(255,255,255,0.12)` | Hover border      |
| brand-400        | `#6280fd` | Primary accent, icons         |
| brand-600        | `#2535ea` | Active nav, strong brand      |
| text primary     | `text-slate-100` → `#e8e8e8` |             |
| text secondary   | `text-slate-400` → `#94a3b8` |             |
| text muted       | `text-slate-500` → `#64748b` |             |
| text disabled    | `text-slate-600/700`          |             |

---

## Utility Classes (globals.css)

### `.dark-card`
```css
.dark-card {
  position: relative;
  overflow: hidden;
  background: #141414;
  border: 1px solid rgba(255,255,255,0.07);
}
/* Animated light-sweep effect on ::after */
```

### `.glass-feature-card`
```css
.glass-feature-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
}
.glass-feature-card:hover {
  background: rgba(255,255,255,0.055);
  border-color: rgba(255,255,255,0.18);
}
```

### `.shimmer` (loading skeleton)
```css
.shimmer {
  background: linear-gradient(90deg, #1c1c1c 25%, #222222 50%, #1c1c1c 75%);
  background-size: 600px 100%;
  animation: shimmer 1.8s infinite linear;
}
```

### `.fade-in-up`
```css
.fade-in-up { animation: fadeInUp 0.35s ease-out forwards; }
```

### `.gradient-button` (component CSS class)
Complex animated radial-gradient button with CSS custom properties transitions. See `gradient-button.tsx`.

---

## Keyframes Summary
- `aurora-shift` — subtle body background radial gradient movement (16s)
- `light-sweep` — diagonal light sweep across `.dark-card` (8s)
- `border-glow` — subtle box-shadow pulse (4s)
- `fadeInUp` — card entrance: opacity 0→1 + translateY 8px→0 (0.35s)
- `blink` — typing cursor (1.4s)
- `shimmer` — loading skeleton (1.8s)
- `softGlow` — pulse glow (4s)
- `ticker-scroll` — horizontal ticker (35s)
- `pl-ringA/B/C/D` — planet loader SVG rings (2s each)
