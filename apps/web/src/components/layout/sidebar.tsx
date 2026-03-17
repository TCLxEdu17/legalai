'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Scale, Bot, MessageSquare, FileText, Upload, Settings,
  LayoutDashboard, ChevronRight, ChevronDown, Globe, Activity,
  Key, ScanSearch, BarChart2, Calculator, CalendarDays, Heart,
  Calendar, Users, ClipboardCheck, FileEdit, CreditCard,
  FileBarChart, GitCompare, Gavel, Flag, FolderOpen, X,
  TrendingUp, FileSignature, DollarSign, CheckSquare, Scroll,
  BookOpen, StickyNote, Brain, Mic, Handshake, Zap, ShieldCheck,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { useState, useEffect, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Context ────────────────────────────────────────────────────────────────
interface SidebarCtx { open: boolean; setOpen: (v: boolean) => void }
const SidebarContext = createContext<SidebarCtx>({ open: false, setOpen: () => {} });
const useSidebar = () => useContext(SidebarContext);

// ─── Nav data ────────────────────────────────────────────────────────────────
type NavChild = { icon: React.ElementType; label: string; tab: string };
type NavItem = {
  href: string; icon: React.ElementType; label: string;
  exact?: boolean; badge?: string; badgeColor?: 'emerald' | 'violet' | 'amber';
  adminOnly?: boolean; trialVisible?: boolean; children?: NavChild[];
};
type NavGroup = { label?: string; items: NavItem[] };

const CASE_CHILDREN: NavChild[] = [
  { icon: MessageSquare, label: 'Chat com Autos', tab: 'chat' },
  { icon: FileText,      label: 'Documentos',     tab: 'documentos' },
  { icon: Scale,         label: 'Peças',           tab: 'pecas' },
  { icon: Brain,         label: 'Análise IA',      tab: 'analise' },
  { icon: Mic,           label: 'Audiência',       tab: 'audiencia' },
  { icon: Handshake,     label: 'Acordo',          tab: 'acordo' },
];

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', exact: true },
      { href: '/dashboard/funcionalidades', icon: Zap, label: 'Funcionalidades', badge: '✦ Explore', badgeColor: 'violet' },
    ],
  },
  {
    label: 'IA & Casos',
    items: [
      { href: '/dashboard/casos', icon: FolderOpen, label: 'Meus Casos', children: CASE_CHILDREN },
      { href: '/dashboard/copiloto', icon: Bot, label: 'Augustus AI' },
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
      { href: '/dashboard/ingestoes', icon: Activity, label: 'Ingestões', adminOnly: true, trialVisible: true },
      { href: '/dashboard/metricas', icon: BarChart2, label: 'Métricas', adminOnly: true },
      { href: '/dashboard/api', icon: Key, label: 'API & Chaves', adminOnly: true },
      { href: '/dashboard/admin/flags', icon: Flag, label: 'Feature Flags', adminOnly: true },
      { href: '/dashboard/configuracoes', icon: Settings, label: 'Configurações', adminOnly: true },
    ],
  },
];

// ─── Sidebar label (animated) ─────────────────────────────────────────────
function SidebarLabel({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  return (
    <motion.span
      animate={{ opacity: open ? 1 : 0, width: open ? 'auto' : 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden whitespace-nowrap text-sm"
    >
      {children}
    </motion.span>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────
const badgeClass = (color?: 'emerald' | 'violet' | 'amber') => {
  if (color === 'violet') return 'bg-violet-500/20 text-violet-300 border border-violet-500/20';
  if (color === 'amber') return 'bg-amber-500/20 text-amber-400';
  return 'bg-emerald-500/20 text-emerald-400';
};

// ─── Desktop sidebar ──────────────────────────────────────────────────────
function DesktopSidebar({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebar();
  return (
    <motion.aside
      animate={{ width: open ? 240 : 56 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="hidden lg:flex flex-col h-full bg-[#0a0a0a] border-r border-white/[0.06] shrink-0 overflow-hidden relative"
    >
      {children}
    </motion.aside>
  );
}

// ─── Mobile sidebar ───────────────────────────────────────────────────────
function MobileSidebar({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  const { open } = useSidebar();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute left-0 top-0 bottom-0 w-64 bg-[#0a0a0a] flex flex-col border-r border-white/[0.06] shadow-2xl"
          >
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────
export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [casesExpanded, setCasesExpanded] = useState(false);

  const caseIdMatch = pathname.match(/^\/dashboard\/casos\/([^/?]+)/);
  const currentCaseId = caseIdMatch?.[1];
  const isOnCases = pathname.startsWith('/dashboard/casos');

  useEffect(() => {
    setAdmin(isAdmin());
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsTrial(user?.email?.endsWith('@trial.legalai.com.br') ?? false);
    } catch {}
  }, []);

  useEffect(() => { if (isOnCases) setCasesExpanded(true); }, [isOnCases]);

  // Close mobile on navigate
  useEffect(() => { if (mobileOpen && onClose) onClose(); }, [pathname]); // eslint-disable-line

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
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

  const childHref = (child: NavChild) =>
    currentCaseId ? `/dashboard/casos/${currentCaseId}?tab=${child.tab}` : '/dashboard/casos';

  const isChildActive = (child: NavChild) => {
    if (!currentCaseId) return false;
    const tabParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tab')
      : null;
    return tabParam === child.tab || (!tabParam && child.tab === 'chat');
  };

  const navContent = (alwaysOpen: boolean) => (
    <SidebarContext.Provider value={{ open: alwaysOpen || open, setOpen }}>
      {/* Gradient top */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-brand-600/5 to-transparent pointer-events-none z-0" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/[0.06] shrink-0 relative z-10 h-[57px]">
        <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center shrink-0">
          <Scale className="w-4 h-4 text-brand-400" />
        </div>
        <motion.div
          animate={{ opacity: (alwaysOpen || open) ? 1 : 0, width: (alwaysOpen || open) ? 'auto' : 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          <p className="text-slate-100 font-semibold text-sm leading-tight whitespace-nowrap">LegalAI</p>
          <p className="text-slate-600 text-xs whitespace-nowrap">Assistente Jurídico</p>
        </motion.div>
        {alwaysOpen && onClose && (
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5 relative z-10">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-1' : ''}>
            {/* Group label */}
            {group.label && (
              <motion.p
                animate={{ opacity: (alwaysOpen || open) ? 1 : 0, height: (alwaysOpen || open) ? 'auto' : 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-700 select-none whitespace-nowrap"
              >
                {group.label}
              </motion.p>
            )}
            {group.label && !(alwaysOpen || open) && gi > 0 && (
              <div className="mx-auto w-6 border-t border-white/[0.06] my-1.5" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const hasCaseChildren = item.children === CASE_CHILDREN;
                const showChildren = hasCaseChildren && casesExpanded && (alwaysOpen || open);
                const isFuncionalidades = item.href === '/dashboard/funcionalidades';

                const baseItemCls = cn(
                  'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors group w-full',
                  isFuncionalidades
                    ? active
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      : 'text-violet-400/70 hover:text-violet-300 hover:bg-violet-600/10 border border-violet-500/10 hover:border-violet-500/20'
                    : active
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent',
                );

                const iconCls = cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isFuncionalidades ? 'text-violet-400'
                    : active ? 'text-brand-400' : 'text-slate-600 group-hover:text-slate-400',
                );

                return (
                  <div key={item.href}>
                    {hasCaseChildren ? (
                      <button onClick={() => setCasesExpanded(v => !v)} className={baseItemCls}>
                        <item.icon className={iconCls} />
                        <SidebarLabel>
                          <span className="flex-1 text-left">{item.label}</span>
                        </SidebarLabel>
                        {(alwaysOpen || open) && (
                          casesExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0 ml-auto" />
                            : <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 ml-auto" />
                        )}
                      </button>
                    ) : (
                      <Link href={item.href} className={baseItemCls}>
                        <item.icon className={iconCls} />
                        <SidebarLabel>
                          <span className="flex-1 truncate">{item.label}</span>
                        </SidebarLabel>
                        {(alwaysOpen || open) && item.badge && (
                          <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0', badgeClass(item.badgeColor))}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )}

                    {/* Case sub-items */}
                    {showChildren && (
                      <div className="ml-4 mt-0.5 pl-3 border-l border-white/[0.06] space-y-0.5">
                        {item.children!.map((child) => {
                          const childActive = isChildActive(child);
                          return (
                            <Link
                              key={child.tab}
                              href={childHref(child)}
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

      {/* Footer */}
      <motion.div
        animate={{ opacity: (alwaysOpen || open) ? 1 : 0 }}
        className="px-4 py-3 border-t border-white/[0.06] shrink-0"
      >
        <p className="text-slate-700 text-xs text-center">v2.3.4</p>
      </motion.div>
    </SidebarContext.Provider>
  );

  return (
    <>
      {/* Desktop */}
      <SidebarContext.Provider value={{ open, setOpen }}>
        <DesktopSidebar>
          {navContent(false)}
        </DesktopSidebar>
      </SidebarContext.Provider>

      {/* Mobile */}
      <SidebarContext.Provider value={{ open: !!mobileOpen, setOpen: (v) => { if (!v && onClose) onClose(); } }}>
        <MobileSidebar onClose={onClose}>
          {navContent(true)}
        </MobileSidebar>
      </SidebarContext.Provider>
    </>
  );
}
