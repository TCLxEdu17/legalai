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
  CalendarDays,
  Heart,
  Calendar,
  Users,
  ClipboardCheck,
  FileEdit,
  CreditCard,
  FileBarChart,
  GitCompare,
  Gavel,
  Flag,
  FolderOpen,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { isEnabled, type FeatureFlag } from '@/lib/features';

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  badge?: string;
  adminOnly?: boolean;
  trialVisible?: boolean;
  flag?: FeatureFlag;
};

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', exact: true },
  { href: '/dashboard/casos', icon: FolderOpen, label: 'Meus Casos', badge: 'New!' },
  { href: '/dashboard/chat', icon: MessageSquare, label: 'Assistente Jurídico' },
  { href: '/dashboard/analise', icon: ScanSearch, label: 'Análise de Documento', badge: 'New!', flag: 'analise' },
  { href: '/dashboard/jurisprudencias', icon: FileText, label: 'Jurisprudências', flag: 'jurisprudencias' },
  { href: '/dashboard/processos', icon: Gavel, label: 'Processos', flag: 'processos' },
  { href: '/dashboard/consultas', icon: Search, label: 'Consultas (CEP/CNPJ)', flag: 'processos' },
  { href: '/dashboard/calculadora', icon: Calculator, label: 'Calc. Honorários', badge: 'New!', flag: 'calculadora' },
  { href: '/dashboard/prazos', icon: CalendarDays, label: 'Prazos Processuais', flag: 'prazos' },
  { href: '/dashboard/favoritos', icon: Heart, label: 'Favoritos' },
  { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda de Audiências', flag: 'agenda' },
  { href: '/dashboard/clientes', icon: Users, label: 'Clientes', flag: 'clientes' },
  { href: '/dashboard/revisor', icon: ClipboardCheck, label: 'Revisor de Peças', flag: 'revisor' },
  { href: '/dashboard/minutas', icon: FileEdit, label: 'Minutas Automáticas', flag: 'minutas' },
  { href: '/dashboard/planos', icon: CreditCard, label: 'Planos e Uso', flag: 'planos' },
  { href: '/dashboard/relatorio', icon: FileBarChart, label: 'Relatório Mensal', flag: 'relatorio' },
  { href: '/dashboard/comparador', icon: GitCompare, label: 'Comparador de Decisões', flag: 'comparador' },
  { href: '/dashboard/upload', icon: Upload, label: 'Upload Manual', adminOnly: true },
  { href: '/dashboard/fontes', icon: Globe, label: 'Fontes Automáticas', adminOnly: true, trialVisible: true },
  { href: '/dashboard/ingestoes', icon: Activity, label: 'Histórico de Ingestões', adminOnly: true, trialVisible: true },
  { href: '/dashboard/metricas', icon: BarChart2, label: 'Métricas', adminOnly: true },
  { href: '/dashboard/api', icon: Key, label: 'API & Chaves', adminOnly: true, flag: 'api' },
  { href: '/dashboard/admin/flags', icon: Flag, label: 'Feature Flags', adminOnly: true },
  { href: '/dashboard/configuracoes', icon: Settings, label: 'Configurações', adminOnly: true },
];

const COLLAPSED_KEY = 'sidebar_collapsed';

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setAdmin(isAdmin());
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsTrial(user?.email?.endsWith('@trial.legalai.com.br') ?? false);
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved !== null) setCollapsed(saved === '1');
    } catch {}
    const flagMap: Record<string, boolean> = {};
    const featureFlags = [
      'calculadora', 'prazos', 'agenda', 'clientes', 'minutas',
      'revisor', 'comparador', 'processos', 'relatorio', 'webhooks',
      'planos', 'analise', 'jurisprudencias', 'api',
    ] as FeatureFlag[];
    featureFlags.forEach((f) => { flagMap[f] = isEnabled(f); });
    setFlags(flagMap);
  }, []);

  useEffect(() => {
    if (mobileOpen && onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
  }

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const isVisible = (item: NavItem) => {
    if (item.flag && flags[item.flag] === false) return false;
    if (item.adminOnly && !admin && !(item.trialVisible && isTrial)) return false;
    return true;
  };

  const visibleItems = navItems.filter(isVisible);

  const sidebarContent = (collapsed: boolean) => (
    <>
      {/* Subtle glow at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand-600/5 to-transparent pointer-events-none" />

      {/* Logo + collapse button */}
      <div className={cn(
        'border-b border-white/[0.06] relative flex items-center shrink-0',
        collapsed ? 'justify-center p-3' : 'justify-between p-5',
      )}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <p className="text-slate-100 font-semibold text-sm leading-tight">LegalAI</p>
              <p className="text-slate-600 text-xs">Assistente Jurídico</p>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
            <Scale className="w-4 h-4 text-brand-400" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {/* Desktop collapse toggle */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title={collapsed ? 'Expandir sidebar' : 'Minimizar sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          {/* Mobile close */}
          {onClose && (
            <button onClick={onClose} className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto relative z-10">
        {visibleItems.map((item) => {
          const active = isActive(item);
          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all',
                  active
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                    : 'text-slate-600 hover:text-slate-200 hover:bg-white/5 border border-transparent',
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
              </Link>
            );
          }
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
              <item.icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? 'text-brand-400' : 'text-slate-600 group-hover:text-slate-400')} />
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
      {!collapsed && (
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <p className="text-slate-700 text-xs text-center">v1.6.19</p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-[#0a0a0a] border-r border-white/[0.06] shrink-0 relative transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}>
        {sidebarContent(collapsed)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a0a0a] flex flex-col relative z-10 shadow-2xl">
            {sidebarContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
