# Theme — LegalAI

## Framework & Styling
- Next.js 14 App Router
- Tailwind CSS v3
- Radix UI primitives
- framer-motion for animations
- Font: Inter (sans-serif)

## tailwind.config.ts
```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          50: '#f0f4ff', 100: '#dde6ff', 200: '#c2d0ff', 300: '#96aeff',
          400: '#6280fd', 500: '#3b55f5', 600: '#2535ea', 700: '#1e27d2',
          800: '#1e24aa', 900: '#1e2586', 950: '#141659',
        },
        slate: { 850: '#1a2235', 950: '#0d1526' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: {
        lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};
export default config;
```

## globals.css (CSS variables)
```css
:root {
  --background: 0 0% 4%;
  --foreground: 0 0% 91%;
  --card: 0 0% 6%;
  --card-foreground: 0 0% 91%;
  --primary: 228 96% 60%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 12%;
  --muted: 0 0% 10%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 14%;
  --destructive: 0 84% 60%;
  --border: 0 0% 12%;
  --input: 0 0% 12%;
  --ring: 228 96% 60%;
  --radius: 0.5rem;
}
```

## Design Tokens (dark mode defaults)
- Background: `#0a0a0a` / `#080808`
- Card bg: `#141414` / `#111111`
- Border: `rgba(255,255,255,0.06)` – `rgba(255,255,255,0.12)` on hover
- Primary brand: `#2535ea` (brand-600), `#6280fd` (brand-400)
- Text primary: `text-slate-100` (#f0f0f0)
- Text secondary: `text-slate-400` / `text-slate-500`
- Radius: `rounded-xl` (12px) / `rounded-2xl` (16px) for cards
- Active nav item: `bg-brand-600/15 text-brand-400 border border-brand-500/20`

## Animation utilities in globals.css
- `.dark-card` — dark bg + animated light sweep via `::after`
- `.glow-pulse` — softGlow keyframe
- `.fade-in-up` — fadeInUp keyframe
- `.shimmer` — skeleton loader
- `body::before` — aurora radial gradient overlay
- `@keyframes aurora-shift, light-sweep, border-glow, fadeInUp, blink, shimmer, softGlow, ticker-scroll`
