# Pages — LegalAI (dependency trees)

## Landing Page (`/`)
File: `apps/web/src/app/page.tsx`
Dependencies:
- `apps/web/src/components/ui/motion.tsx` (FadeIn, ScrollReveal, InteractiveCard, Parallax, StaggerContainer, StaggerItem)
- `apps/web/src/components/ui/carousel.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`

Key sections: Header (logo + login CTA), Hero (h1 + badge + CTA), Feature cards grid/carousel, "Como funciona" steps, CTA section (checklist), Footer

## Login Page (`/login`)
File: `apps/web/src/app/login/page.tsx`
Dependencies:
- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/utils.ts`
- `apps/web/src/app/globals.css`

Key sections: Logo, form card (email + password + submit)

## Dashboard Home (`/dashboard`)
File: `apps/web/src/app/dashboard/page.tsx`
Dependencies:
- `apps/web/src/components/ui/motion.tsx`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/auth.ts`
- `apps/web/src/app/globals.css`

Key sections: Welcome header + LiveBadge, Stats grid (4 cards), Growth banner, ThemeBars, Quick actions grid, Recent sessions, Tribunais list

## Dashboard Layout (wraps all /dashboard/*)
File: `apps/web/src/app/dashboard/layout.tsx`
Dependencies:
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/components/layout/header.tsx`
- `apps/web/src/components/ui/cookie-banner.tsx`
- `apps/web/src/components/ui/trial-countdown.tsx`
- `apps/web/src/components/ui/dollar-ticker.tsx`
