'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const POSTHOG_KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// Inicializa uma única vez no cliente
if (typeof window !== 'undefined' && POSTHOG_KEY && !posthog.__loaded) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,       // gerenciamos manualmente abaixo
    capture_pageleave: true,
    autocapture: true,             // cliques, inputs, submits automáticos
    session_recording: {
      maskAllInputs: true,         // oculta senhas / dados sensíveis
    },
    persistence: 'localStorage+cookie',
  });
}

/** Dispara pageview a cada navegação do App Router */
function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [pathname]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PageViewTracker />
      {children}
    </PHProvider>
  );
}
