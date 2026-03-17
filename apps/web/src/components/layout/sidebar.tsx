'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Scale,
  Bot,
  MessageSquare,
  FileText,
  Upload,
  Settings,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
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
  TrendingUp,
  FileSignature,
  DollarSign,
  CheckSquare,
  Scroll,
  BookOpen,
  StickyNote,
  Brain,
  Mic,
  Handshake,
  Zap,
  ShieldAlert,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { useState, useEffect } from 'react';

type NavChild = {
  icon: React.ElementType;
  label: string;
  tab: string;
};

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  badge?: string;
  badgeColor?: 'emerald' | 'violet' | 'amber';
  adminOnly?: boolean;
  trialVisible?: boolean;
  children?: NavChild[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const CASE_CHILDREN: NavChild[] = [
  { icon: MessageSquare, label: 'Chat com Autos', tab: 'chat' },
  { icon: FileText, label: 'Documentos', tab: 'documentos' },
  { icon: Scale, label: 'Peças', tab: 'pecas' },
  { icon: Brain, label: 'Análise IA', tab: 'analise' },
  { icon: Mic, label: 'Audiência', tab: 'audiencia' },
  { icon: Handshake, label: 'Acordo', tab: 'acordo' },
];

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', exact: true },
      {
        href: '/dashboard/funcionalidades',
        icon: Zap,
        label: 'Todas as Funcionalidades',
        badge: '✦ Explore',
        badgeColor: 'violet',
      },
    ],
  },
  {
    label: 'IA & Casos',
    items: [
      {
        href: '/dashboard/casos',
        icon: FolderOpen,
        label: 'Meus Casos',
        children: CASE_CHILDREN,
      },
      { href: '/dashboard/copiloto', icon: Bot, label: 'Copiloto IA' },
      { href: '/dashboard/chat', icon: MessageSquare, label: 'Assistente Jurídico' },
      { href: '/dashboard/analise', icon: ScanSearch, label: 'Análise de Documento' },
      { href: '/dashboard/predicao', icon: TrendingUp, label: 'Análise Preditiva' },
      { href: '/dashboard/revisor', icon: ClipboardCheck, label: 'Revisor de Peças' },
      { href: '/dashboard/minutas', icon: FileEdit, label: 'Minutas Automáticas' },
    ],
  },
  {
    label: 'Pesquisa',
    items: [
      { href: '/dashboard/jurisprudencias', icon: FileText, label: 'Jurisprudências' },
      { href: '/dashboard/processos', icon: Gavel, label: 'Processos' },
      { href: '/dashboard/processos-privados', icon: ShieldCheck, label: 'Processos Privados', badge: 'PRO', badgeColor: 'amber' },
      { href: '/dashboard/consultas', icon: Search, label: 'Consultas (CEP/CNPJ)' },
      { href: '/dashboard/comparador', icon: GitCompare, label: 'Comparador de Decisões' },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { href: '/dashboard/calculadora', icon: Calculator, label: 'Calc. Honorários' },
      { href: '/dashboard/atualizacao', icon: TrendingUp, label: 'Atualização Monetária' },
      { href: '/dashboard/prazos', icon: CalendarDays, label: 'Prazos Processuais' },
      { href: '/dashboard/dicionario', icon: BookOpen, label: 'Dicionário Jurídico' },
      { href: '/dashboard/notas', icon: StickyNote, label: 'Bloco de Notas' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/dashboard/contratos', icon: FileSignature, label: 'Contratos de Honorários' },
      { href: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
      { href: '/dashboard/tarefas', icon: CheckSquare, label: 'Diligências e Tarefas' },
      { href: '/dashboard/procuracoes', icon: Scroll, label: 'Procurações' },
      { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda de Audiências' },
      { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
      { href: '/dashboard/relatorio', icon: FileBarChart, label: 'Relatório Mensal' },
    ],
  },
  {
    label: 'Conta',
    items: [
      { href: '/dashboard/favoritos', icon: Heart, label: 'Favoritos' },
      { href: '/dashboard/planos', icon: CreditCard, label: 'Planos e Uso' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/dashboard/upload', icon: Upload, label: 'Upload Manual', adminOnly: true },
      { href: '/dashboard/fontes', icon: Globe, label: 'Fontes Automáticas', adminOnly: true, trialVisible: true },
      { href: '/dashboard/ingestoes', icon: Activity, label: 'Histórico de Ingestões', adminOnly: true, trialVisible: true },
      { href: '/dashboard/metricas', icon: BarChart2, label: 'Métricas', adminOnly: true },
      { href: '/dashboard/api', icon: Key, label: 'API & Chaves', adminOnly: true },
      { href: '/dashboard/admin/flags', icon: Flag, label: 'Feature Flags', adminOnly: true },
      { href: '/dashboard/configuracoes', icon: Settings, label: 'Configurações', adminOnly: true },
    ],
  },
];

const COLLAPSED_KEY = 'sidebar_collapsed';

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [casesExpanded, setCasesExpanded] = useState(false);

  // Extract case ID from pathname if on a case detail page
  const caseIdMatch = pathname.match(/^\/dashboard\/casos\/([^/?]+)/);
  const currentCaseId = caseIdMatch?.[1];
  const isOnCases = pathname.startsWith('/dashboard/casos');

  useEffect(() => {
    setAdmin(isAdmin());
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsTrial(user?.email?.endsWith('@trial.legalai.com.br') ?? false);
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved !== null) setCollapsed(saved === '1');
    } catch {}
  }, []);

  // Auto-expand when on casos
  useEffect(() => {
    if (isOnCases) setCasesExpanded(true);
  }, [isOnCases]);

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
    // "Meus Casos" is active only for exact match or sub-paths
    if (item.href === '/dashboard/casos') return pathname.startsWith('/dashboard/casos');
    return pathname.startsWith(item.href);
  };

  const isVisible = (item: NavItem) => {
    if (item.adminOnly && !admin && !(item.trialVisible && isTrial)) return false;
    return true;
  };

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(isVisible) }))
    .filter((g) => g.items.length > 0);

  function childHref(child: NavChild): string {
    if (currentCaseId) return `/dashboard/casos/${currentCaseId}?tab=${child.tab}`;
    return `/dashboard/casos`;
  }

  function isChildActive(child: NavChild): boolean {
    if (!currentCaseId) return false;
    const tabParam = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    ).get('tab');
    return tabParam === child.tab || (!tabParam && child.tab === 'chat');
  }

  const badgeClass = (color?: 'emerald' | 'violet' | 'amber') => {
    if (color === 'violet') return 'bg-violet-500/20 text-violet-300 border border-violet-500/20';
    if (color === 'amber') return 'bg-amber-500/20 text-amber-400';
    return 'bg-emerald-500/20 text-emerald-400';
  };

  const sidebarContent = (collapsed: boolean) => (
    <>
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
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title={collapsed ? 'Expandir sidebar' : 'Minimizar sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto relative z-10 space-y-1">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-1' : ''}>
            {group.label && !collapsed && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-700 select-none">
                {group.label}
              </p>
            )}
            {group.label && collapsed && gi > 0 && (
              <div className="mx-auto w-6 border-t border-white/[0.06] my-1.5" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const hasCaseChildren = item.children === CASE_CHILDREN;
                const showChildren = hasCaseChildren && casesExpanded && !collapsed;

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
                  <div key={item.href}>
                    {/* Main item */}
                    {hasCaseChildren ? (
                      <button
                        onClick={() => setCasesExpanded((v) => !v)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                          active
                            ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent',
                        )}
                      >
                        <item.icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? 'text-brand-400' : 'text-slate-600 group-hover:text-slate-400')} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {casesExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          : <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        }
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                          item.href === '/dashboard/funcionalidades'
                            ? active
                              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                              : 'text-violet-400/70 hover:text-violet-300 hover:bg-violet-600/10 border border-violet-500/10 hover:border-violet-500/20'
                            : active
                              ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                              : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent',
                        )}
                      >
                        <item.icon className={cn('w-4 h-4 shrink-0 transition-colors',
                          item.href === '/dashboard/funcionalidades'
                            ? 'text-violet-400'
                            : active ? 'text-brand-400' : 'text-slate-600 group-hover:text-slate-400'
                        )} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold', badgeClass(item.badgeColor))}>
                            {item.badge}
                          </span>
                        )}
                        {!item.badge && active && !hasCaseChildren && (
                          <ChevronRight className="w-3 h-3 text-brand-500/60" />
                        )}
                      </Link>
                    )}

                    {/* Sub-items (case tabs) */}
                    {showChildren && (
                      <div className="ml-4 mt-0.5 pl-3 border-l border-white/[0.06] space-y-0.5">
                        {item.children!.map((child) => {
                          const childActive = isChildActive(child);
                          const href = childHref(child);
                          return (
                            <Link
                              key={child.tab}
                              href={href}
                              className={cn(
                                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                                childActive
                                  ? 'bg-brand-600/10 text-brand-400'
                                  : currentCaseId
                                    ? 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                                    : 'text-slate-700 cursor-default',
                              )}
                            >
                              <child.icon className={cn('w-3.5 h-3.5 shrink-0', childActive ? 'text-brand-400' : 'text-slate-600')} />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <p className="text-slate-700 text-xs text-center">v2.3.4</p>
        </div>
      )}
    </>
  );

  return (
    <>
      <aside className={cn(
        'hidden lg:flex flex-col bg-[#0a0a0a] border-r border-white/[0.06] shrink-0 relative transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}>
        {sidebarContent(collapsed)}
      </aside>

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
