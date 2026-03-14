'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Scale,
  MessageSquare,
  FileText,
  Upload,
  Settings,
  LayoutDashboard,
  ChevronRight,
  Globe,
  Activity,
  Key,
  ScanSearch,
  BarChart2,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', exact: true },
  { href: '/dashboard/chat', icon: MessageSquare, label: 'Assistente Jurídico' },
  { href: '/dashboard/analise', icon: ScanSearch, label: 'Análise de Documento', badge: 'New!' },
  { href: '/dashboard/jurisprudencias', icon: FileText, label: 'Jurisprudências' },
  { href: '/dashboard/calculadora', icon: Calculator, label: 'Calc. Honorários', badge: 'New!' },
  { href: '/dashboard/upload', icon: Upload, label: 'Upload Manual', adminOnly: true },
  { href: '/dashboard/fontes', icon: Globe, label: 'Fontes Automáticas', adminOnly: true, trialVisible: true },
  { href: '/dashboard/ingestoes', icon: Activity, label: 'Histórico de Ingestões', adminOnly: true, trialVisible: true },
  { href: '/dashboard/metricas', icon: BarChart2, label: 'Métricas', adminOnly: true },
  { href: '/dashboard/api', icon: Key, label: 'API & Chaves', badge: 'New!' },
  { href: '/dashboard/configuracoes', icon: Settings, label: 'Configurações', adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    setAdmin(isAdmin());
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsTrial(user?.email?.endsWith('@trial.legalai.com.br') ?? false);
    } catch {}
  }, []);

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-60 bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col shrink-0 relative">
      {/* Subtle glow at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand-600/5 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="p-5 border-b border-white/[0.06] relative">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <p className="text-slate-100 font-semibold text-sm leading-tight">LegalAI</p>
            <p className="text-slate-600 text-xs">Assistente Jurídico</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative z-10">
        {navItems
          .filter((item) => !item.adminOnly || admin || (item.trialVisible && isTrial))
          .map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  active
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent',
                )}
              >
                <item.icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    active ? 'text-brand-400' : 'text-slate-600 group-hover:text-slate-400',
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && !active && (
                  <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                    {item.badge}
                  </span>
                )}
                {active && <ChevronRight className="w-3 h-3 text-brand-500/60" />}
              </Link>
            );
          })}
      </nav>

      {/* Version */}
      <div className="p-4 border-t border-white/[0.06]">
        <p className="text-slate-700 text-xs text-center">v1.5.0</p>
      </div>
    </aside>
  );
}
