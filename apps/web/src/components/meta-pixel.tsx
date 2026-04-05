'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { pageview } from '@/lib/pixel';

/**
 * Fires a PageView event on every client-side navigation.
 * The initial PageView on first load is also covered (mount effect).
 * Rendered only when NEXT_PUBLIC_FB_PIXEL_ID is set.
 */
export function MetaPixelPageView() {
  const pathname = usePathname();

  useEffect(() => {
    pageview();
  }, [pathname]);

  return null;
}
