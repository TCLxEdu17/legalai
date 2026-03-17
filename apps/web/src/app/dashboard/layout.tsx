'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, logout } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CookieBanner } from '@/components/ui/cookie-banner';
import { TrialCountdown } from '@/components/ui/trial-countdown';
import { WifiOff } from 'lucide-react';
import { DollarTicker } from '@/components/ui/dollar-ticker';
import { apiClient } from '@/lib/api-client';

const ACTIVITY_KEY = 'legalai_last_activity';
const TRIAL_KEY = 'legalai_trial';
const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas sem atividade

function updateActivity() {
  try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch {}
}

function getTrialId(): string | null {
  try {
    const raw = localStorage.getItem(TRIAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.id ?? null;
  } catch { return null; }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lastClickTrackRef = useRef<number>(0);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    setIsOffline(!navigator.onLine);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const checkSession = useCallback(async () => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    try {
      const last = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10);
      if (last && Date.now() - last > TIMEOUT_MS) {
        await logout();
        router.replace('/login?expired=1');
      }
    } catch {}
  }, [router]);

  useEffect(() => {
    checkSession();

    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));
    updateActivity();

    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [checkSession]);

  // Track page_view for all authenticated users
  useEffect(() => {
    apiClient.trackEvent({ event: 'page_view', page: pathname }).catch(() => {});
    // Also track for trial users (legacy)
    const trialId = getTrialId();
    if (trialId) {
      apiClient.trackTrialMetric(trialId, { event: 'page_view', page: pathname }).catch(() => {});
    }
  }, [pathname]);

  // Track throttled clicks for all authenticated users (at most 1 per 10s per page)
  useEffect(() => {
    const handleClick = () => {
      const now = Date.now();
      if (now - lastClickTrackRef.current < 10_000) return;
      lastClickTrackRef.current = now;
      apiClient.trackEvent({ event: 'click', page: pathname }).catch(() => {});
      // Also track for trial users (legacy)
      const trialId = getTrialId();
      if (trialId) {
        apiClient.trackTrialMetric(trialId, { event: 'click', page: pathname }).catch(() => {});
      }
    };

    window.addEventListener('click', handleClick, { passive: true });
    return () => window.removeEventListener('click', handleClick);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <TrialCountdown />
        {isOffline && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/20 text-amber-400 text-xs shrink-0">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            Você está offline — algumas funcionalidades podem estar indisponíveis
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">{children}</main>
        <DollarTicker />
      </div>
      <CookieBanner />
    </div>
  );
}
