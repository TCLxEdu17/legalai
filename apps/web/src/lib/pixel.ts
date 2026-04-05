export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

function isReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.fbq === 'function' &&
    !!FB_PIXEL_ID
  );
}

export function pageview(): void {
  if (!isReady()) return;
  window.fbq('track', 'PageView');
}

export function event(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (!isReady()) return;
  window.fbq('track', name, params);
}
