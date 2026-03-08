'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, logout } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const ACTIVITY_KEY = 'legalai_last_activity';
const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas sem atividade

function updateActivity() {
  try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch {}
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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

  return (
    <div className="flex h-screen bg-[#08080f] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 relative z-10">{children}</main>
      </div>
    </div>
  );
}
