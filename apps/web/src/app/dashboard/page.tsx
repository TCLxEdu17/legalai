'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  FileText,
  Upload,
  Database,
  ArrowRight,
  Zap,
  TrendingUp,
  BookOpen,
  Scale,
  Activity,
  Settings2,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';
import type { DocumentStats, User } from '@/types';

// Hook de contador animado (count-up com easing)
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    prevTarget.current = target;
    startRef.current = null;

    const from = value;
    const range = target - from;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(from + eased * range));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-medium text-emerald-400">
      <span className="relative flex w-2 h-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
      </span>
      Base atualizando diariamente
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  bgColor,
  iconColor,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  sub?: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="dark-card rounded-xl p-4 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-xs font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-100 tabular-nums">
        {animated.toLocaleString('pt-BR')}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function ThemeBar({ theme, count, max }: { theme: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  const COLORS = [
    'bg-brand-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-sky-500', 'bg-rose-500', 'bg-teal-500', 'bg-orange-500',
    'bg-indigo-500', 'bg-pink-500', 'bg-cyan-500', 'bg-lime-600',
  ];
  const idx = Math.abs((theme.charCodeAt(0) ?? 0) + (theme.charCodeAt(1) ?? 0)) % COLORS.length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-300 font-medium truncate pr-2 max-w-[200px]" title={theme}>
          {theme}
        </span>
        <span className="text-xs text-slate-500 tabular-nums shrink-0">{count}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${COLORS[idx]}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

const DEFAULT_WIDGETS = { stats: true, quickActions: true, themes: true, tribunais: true, recentSessions: true };

function useWidgetPrefs() {
  const [prefs, setPrefs] = useState(DEFAULT_WIDGETS);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dashboard-widgets') || '{}');
      setPrefs({ ...DEFAULT_WIDGETS, ...stored });
    } catch {}
  }, []);
  const toggle = (key: keyof typeof DEFAULT_WIDGETS) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dashboard-widgets', JSON.stringify(next));
      return next;
    });
  };
  return { prefs, toggle };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const { prefs, toggle } = useWidgetPrefs();
  useEffect(() => { setUser(getStoredUser()); }, []);

  const { data: stats } = useQuery<DocumentStats>({
    queryKey: ['document-stats'],
    queryFn: () => apiClient.getDocumentStats(),
    refetchInterval: 30_000,
  });

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => apiClient.getChatSessions(),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => apiClient.getFavorites(),
  });

  // Extraídos no topo para respeitar regras dos hooks
  const totalDocs = stats?.totalDocuments ?? 0;
  const totalChunks = stats?.totalChunks ?? 0;
  const indexed = stats?.byStatus?.INDEXED ?? 0;
  const lastWeek = stats?.growth?.lastWeek ?? 0;
  const topThemes = stats?.topThemes ?? [];
  const maxThemeCount = topThemes[0]?.count ?? 1;

  const quickActions = [
    {
      href: '/dashboard/chat',
      icon: MessageSquare,
      title: 'Nova consulta jurídica',
      description: 'Faça uma pergunta à IA com base nas jurisprudências indexadas',
      iconBg: 'bg-brand-600',
    },
    {
      href: '/dashboard/jurisprudencias',
      icon: FileText,
      title: 'Ver jurisprudências',
      description: 'Consulte e gerencie os documentos indexados na base',
      iconBg: 'bg-slate-600',
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            href: '/dashboard/upload',
            icon: Upload,
            title: 'Upload de documento',
            description: 'Adicione novas jurisprudências à base de conhecimento',
            iconBg: 'bg-emerald-600',
          },
          {
            href: '/dashboard/fontes',
            icon: Activity,
            title: 'Fontes automáticas',
            description: 'Gerencie fontes e acompanhe o crescimento diário da base',
            iconBg: 'bg-violet-600',
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 mb-1">
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-slate-500 text-sm">
            Assistente jurídico com IA — base de jurisprudências crescendo diariamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge />
          <button
            onClick={() => setShowCustomize(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-xs transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Personalizar
          </button>
        </div>
      </div>

      {/* Customize modal */}
      {showCustomize && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
              <h3 className="font-semibold text-slate-100">Personalizar painel</h3>
              <button onClick={() => setShowCustomize(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {([
                { key: 'stats', label: 'Estatísticas' },
                { key: 'quickActions', label: 'Ações rápidas' },
                { key: 'themes', label: 'Temas jurídicos' },
                { key: 'tribunais', label: 'Tribunais na base' },
                { key: 'recentSessions', label: 'Últimas pesquisas' },
              ] as { key: keyof typeof DEFAULT_WIDGETS; label: string }[]).map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">{label}</span>
                  <button
                    onClick={() => toggle(key)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${prefs[key] ? 'bg-brand-600' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats principais animados */}
      {prefs.stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Documentos"
          value={totalDocs}
          icon={FileText}
          bgColor="bg-brand-600/15"
          iconColor="text-brand-400"
          sub="total na base"
        />
        <StatCard
          label="Chunks vetorizados"
          value={totalChunks}
          icon={Database}
          bgColor="bg-violet-500/15"
          iconColor="text-violet-400"
          sub="fragmentos semânticos"
        />
        <StatCard
          label="Indexados"
          value={indexed}
          icon={Zap}
          bgColor="bg-emerald-500/15"
          iconColor="text-emerald-400"
          sub="prontos para busca"
        />
        <StatCard
          label="Esta semana"
          value={lastWeek}
          icon={TrendingUp}
          bgColor="bg-amber-500/15"
          iconColor="text-amber-400"
          sub="novos documentos"
        />
      </div>}

      {/* Banner de crescimento */}
      <div className="bg-gradient-to-r from-brand-600/10 via-[#141414] to-violet-600/10 border border-brand-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-brand-300">
            Maior base de jurisprudências com IA da América Latina
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-3">
          <div>
            <p className="text-3xl font-bold text-brand-400 tabular-nums">
              {totalDocs.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-brand-500 mt-0.5">jurisprudências indexadas</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-400 tabular-nums">
              +{stats?.growth?.lastWeek ?? 0}
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">adicionados esta semana</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-violet-400 tabular-nums">
              +{stats?.growth?.lastMonth ?? 0}
            </p>
            <p className="text-xs text-violet-500 mt-0.5">adicionados este mês</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Fontes RSS ativas coletam novos julgados diariamente. Sínteses temáticas geradas por IA consolidam o conhecimento por área do direito.
        </p>
      </div>

      {/* Vertentes jurídicas */}
      {prefs.themes && topThemes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Vertentes jurídicas na base
            </h2>
            <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
              {topThemes.length} temas
            </span>
          </div>
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              {topThemes.map(({ theme, count }) => (
                <ThemeBar key={theme} theme={theme} count={count} max={maxThemeCount} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      {prefs.quickActions && <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
          Ações rápidas
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {quickActions.map(({ href, icon: Icon, title, description, iconBg }) => (
            <Link
              key={href}
              href={href}
              className="group bg-[#141414] border border-white/[0.07] rounded-xl p-5 hover:border-brand-500/30 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 mb-1 group-hover:text-brand-400 transition-colors">
                    {title}
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 shrink-0 mt-0.5 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>}

      {/* Últimas pesquisas widget */}
      {prefs.recentSessions && sessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Últimas pesquisas</h2>
            <Link href="/dashboard/chat" className="text-xs text-brand-400 hover:text-brand-300">Ver todas →</Link>
          </div>
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
            {sessions.slice(0, 5).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <MessageSquare className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <p className="text-slate-300 text-sm flex-1 truncate">{s.title}</p>
                <p className="text-slate-600 text-xs">{new Date(s.updatedAt).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tribunais */}
      {prefs.tribunais && stats?.topTribunais && stats.topTribunais.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Tribunais na base
          </h2>
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
            {stats.topTribunais.slice(0, 5).map(({ tribunal, count }) => (
              <div key={tribunal} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-300 font-medium">{tribunal}</span>
                <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                  {count} doc{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
