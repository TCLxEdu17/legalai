# Components — LegalAI Shared UI Primitives

## PlanetLoader
**File:** `src/components/ui/planet-loader.tsx`
**Usage:** Loading states throughout the app (replaces spinner)

```tsx
import { cn } from '@/lib/utils';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg';
const SIZES: Record<LoaderSize, number> = { xs: 20, sm: 32, md: 56, lg: 96 };

interface PlanetLoaderProps { size?: LoaderSize; className?: string; }

export function PlanetLoader({ size = 'md', className }: PlanetLoaderProps) {
  const px = SIZES[size];
  return (
    <svg width={px} height={px} viewBox="0 0 240 240" className={cn('shrink-0', className)} aria-label="Carregando…" role="status">
      <circle className="pl-ring-a" cx="120" cy="120" r="105" fill="none" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round" />
      <circle className="pl-ring-b" cx="120" cy="120" r="35"  fill="none" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round" />
      <circle className="pl-ring-c" cx="85"  cy="120" r="70"  fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
      <circle className="pl-ring-d" cx="155" cy="120" r="70"  fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
    </svg>
  );
}
// CSS ring classes defined in globals.css:
// .pl-ring-a { stroke: #6280fd; }  .pl-ring-b { stroke: #8b5cf6; }
// .pl-ring-c { stroke: #38bdf8; }  .pl-ring-d { stroke: #ec4899; }
```

---

## FadeIn / Motion Wrappers
**File:** `src/components/ui/motion.tsx`

```tsx
'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

// FadeIn: opacity 0→1 + y 12→0
export function FadeIn({ children, delay = 0, duration = 0.4, className, ...props }) { ... }

// ScrollReveal: triggers on scroll into view
export function ScrollReveal({ children, delay = 0, className }) { ... }

// InteractiveCard: scale 1.02 + y -2 on hover
export function InteractiveCard({ children, className, onClick }) { ... }

// StaggerContainer + StaggerItem: staggered children entrance
export function StaggerContainer({ children, className, staggerDelay = 0.05 }) { ... }
export function StaggerItem({ children, className }) { ... }

// Parallax: parallax scroll effect
export function Parallax({ children, offset = 30, className }) { ... }

// PulseOnMount: spring scale 0.9→1
export function PulseOnMount({ children, className }) { ... }

// AnimatedNumber: animated counter (number transitions)
export function AnimatedNumber({ value, className }) { ... }
```

---

## Card (Shadcn-style)
**File:** `src/components/ui/card.tsx`

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
);

// Sub-components: CardHeader, CardTitle, CardDescription, CardContent, CardFooter
// In practice, most pages use raw divs with bg-[#141414] border border-white/[0.07] rounded-xl
```

---

## GradientButton
**File:** `src/components/ui/gradient-button.tsx`
**Usage:** Landing page CTAs. NOT used in dashboard (dashboard uses plain button/Link with Tailwind).

```tsx
"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const gradientButtonVariants = cva([
  "gradient-button",   // CSS class in globals.css — animated radial gradient BG
  "inline-flex items-center justify-center",
  "rounded-[11px] min-w-[132px] px-9 py-4",
  "text-base leading-[19px] font-bold text-white",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:pointer-events-none disabled:opacity-50",
], {
  variants: {
    variant: {
      default: "",
      variant: "gradient-button-variant",
    },
  },
  defaultVariants: { variant: "default" },
});

export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(gradientButtonVariants({ variant, className }))} ref={ref} {...props} />;
  }
);
```

---

## AuroraBackground
**File:** `src/components/ui/aurora-background.tsx`
**Usage:** Login page background — WebGL Three.js shader animation

```tsx
'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function AuroraBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  // Three.js WebGL renderer with GLSL fragment shader
  // Animated aurora borealis effect (green/blue/cyan particles)
  // Fixed position, z-index 0, covers entire viewport
  return <div ref={mountRef} />;
}
```

---

## TrialCountdown
**File:** `src/components/ui/trial-countdown.tsx`
**Usage:** Dashboard layout top banner for trial users

---

## DollarTicker
**File:** `src/components/ui/dollar-ticker.tsx`
**Usage:** Dashboard layout bottom sticky bar, BRL/USD rate

---

## CookieBanner
**File:** `src/components/ui/cookie-banner.tsx`
**Usage:** Dashboard layout, LGPD consent banner

---

## Common Dashboard Button Patterns (inline, no dedicated component)

```tsx
// Primary action button
<button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors">

// Secondary/ghost button
<button className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 text-sm rounded-lg transition-colors border border-white/[0.06]">

// Destructive button
<button className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 text-sm rounded-lg transition-colors">

// Icon button
<button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200">

// Input
<input className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20">
```
