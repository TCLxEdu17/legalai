'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scale, MessageSquare, FileText, Upload, Key, Clock,
  ChevronLeft, ChevronRight, ExternalLink, Globe, Activity,
  Calculator, Download, BookOpen, Code, Users, BarChart2,
  ScanSearch, CheckCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const TRIAL_KEY = 'legalai_trial';
const ONBOARDING_STEP_KEY = 'legalai_onboarding_step';

interface TrialData {
  id: string;
  prefix: string;
  name: string;
  email: string;
  password: string;
  expiresAt: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const remaining = useCountdown(expiresAt);
  return (
    <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2">
      <Clock className="w-4 h-4 text-brand-400" />
      <span className="text-slate-400 text-sm">Tempo restante:</span>
      <span className="text-brand-400 font-mono font-bold">{formatCountdown(remaining)}</span>
    </div>
  );
}

// ─── Feature definitions ────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  brand:  { bg: 'bg-brand-600/20',  border: 'border-brand-500/30',  icon: 'text-brand-400',  badge: 'bg-brand-600/15 text-brand-400' },
  violet: { bg: 'bg-violet-600/20', border: 'border-violet-500/30', icon: 'text-violet-400', badge: 'bg-violet-600/15 text-violet-400' },
  emerald:{ bg: 'bg-emerald-600/20',border: 'border-emerald-500/30',icon: 'text-emerald-400',badge: 'bg-emerald-600/15 text-emerald-400' },
  blue:   { bg: 'bg-blue-600/20',   border: 'border-blue-500/30',   icon: 'text-blue-400',   badge: 'bg-blue-600/15 text-blue-400' },
  indigo: { bg: 'bg-indigo-600/20', border: 'border-indigo-500/30', icon: 'text-indigo-400', badge: 'bg-indigo-600/15 text-indigo-400' },
  cyan:   { bg: 'bg-cyan-600/20',   border: 'border-cyan-500/30',   icon: 'text-cyan-400',   badge: 'bg-cyan-600/15 text-cyan-400' },
  teal:   { bg: 'bg-teal-600/20',   border: 'border-teal-500/30',   icon: 'text-teal-400',   badge: 'bg-teal-600/15 text-teal-400' },
  amber:  { bg: 'bg-amber-600/20',  border: 'border-amber-500/30',  icon: 'text-amber-400',  badge: 'bg-amber-600/15 text-amber-400' },
  rose:   { bg: 'bg-rose-600/20',   border: 'border-rose-500/30',   icon: 'text-rose-400',   badge: 'bg-rose-600/15 text-rose-400' },
  purple: { bg: 'bg-purple-600/20', border: 'border-purple-500/30', icon: 'text-purple-400', badge: 'bg-purple-600/15 text-purple-400' },
  sky:    { bg: 'bg-sky-600/20',    border: 'border-sky-500/30',    icon: 'text-sky-400',    badge: 'bg-sky-600/15 text-sky-400' },
  orange: { bg: 'bg-orange-600/20', border: 'border-orange-500/30', icon: 'text-orange-400', badge: 'bg-orange-600/15 text-orange-400' },
  yellow: { bg: 'bg-yellow-600/20', border: 'border-yellow-500/30', icon: 'text-yellow-400', badge: 'bg-yellow-600/15 text-yellow-400' },
  pink:   { bg: 'bg-pink-600/20',   border: 'border-pink-500/30',   icon: 'text-pink-400',   badge: 'bg-pink-600/15 text-pink-400' },
  lime:   { bg: 'bg-lime-600/20',   border: 'border-lime-500/30',   icon: 'text-lime-400',   badge: 'bg-lime-600/15 text-lime-400' },
};

const FEATURES = [
  {
    id: 'chat', icon: MessageSquare, color: 'brand',
    title: 'Assistente Jurídico com IA',
    description: 'Faça perguntas jurídicas e receba respostas precisas baseadas na sua base de conhecimento. Disponível 24 horas por dia, 7 dias por semana.',
    detail: 'Alimentado por GPT-4o ou Claude — você escolhe',
    href: '/dashboard/chat', cta: 'Abrir assistente',
  },
  {
    id: 'search', icon: ScanSearch, color: 'violet',
    title: 'Busca Semântica Inteligente',
    description: 'Encontra documentos mesmo com palavras diferentes das do texto original. Entende contexto, sinônimos e expressões jurídicas.',
    detail: 'Powered by embeddings vetoriais (pgvector)',
    href: '/dashboard/jurisprudencias', cta: 'Pesquisar agora',
  },
  {
    id: 'upload', icon: Upload, color: 'emerald',
    title: 'Upload de Documentos',
    description: 'Faça upload de acórdãos, doutrinas e peças. O sistema extrai o texto e indexa automaticamente em minutos.',
    detail: 'Suporta PDF, DOCX e TXT — até 50 MB por arquivo',
    href: '/dashboard/upload', cta: 'Fazer upload',
  },
  {
    id: 'analise', icon: ScanSearch, color: 'blue',
    title: 'Análise de Documento',
    description: 'Carregue qualquer contrato ou parecer e faça perguntas específicas sobre ele. Identifica cláusulas, riscos e pontos de atenção.',
    detail: 'Ideal para contratos, procurações e petições',
    href: '/dashboard/analise', cta: 'Analisar documento',
  },
  {
    id: 'jurisprudencias', icon: FileText, color: 'indigo',
    title: 'Base de Jurisprudências',
    description: 'Acervo completo de decisões do STF, STJ, TST e tribunais estaduais, sempre atualizado via coleta automática.',
    detail: 'Filtros por tribunal, data e área do direito',
    href: '/dashboard/jurisprudencias', cta: 'Explorar base',
  },
  {
    id: 'fontes', icon: Globe, color: 'cyan',
    title: 'Fontes Automáticas',
    description: 'Configure coleta automática de jurisprudências via RSS, sitemap e web scraping. A base de conhecimento se atualiza sozinha.',
    detail: 'Agendamento diário, semanal ou personalizado',
    href: '/dashboard/fontes', cta: 'Ver fontes',
  },
  {
    id: 'ingestoes', icon: Activity, color: 'teal',
    title: 'Histórico de Ingestões',
    description: 'Rastreie cada documento indexado: quando foi coletado, qual fonte originou e quantos itens foram processados.',
    detail: 'Log completo com status de cada job de coleta',
    href: '/dashboard/ingestoes', cta: 'Ver histórico',
  },
  {
    id: 'calculadora', icon: Calculator, color: 'amber',
    title: 'Calculadora de Honorários',
    description: 'Calcule honorários advocatícios baseados na Tabela OAB por fase processual, valor da causa e complexidade do caso.',
    detail: 'Cobertura: civil, trabalhista, criminal e mais',
    href: '/dashboard/calculadora', cta: 'Calcular honorários',
  },
  {
    id: 'citacoes', icon: BookOpen, color: 'sky',
    title: 'Respostas com Citações',
    description: 'Cada resposta do assistente indica exatamente quais documentos foram usados como referência — total transparência e rastreabilidade.',
    detail: 'Nunca mais uma resposta sem embasamento',
    href: '/dashboard/chat', cta: 'Testar no chat',
  },
  {
    id: 'pdf', icon: Download, color: 'rose',
    title: 'Exportar em PDF',
    description: 'Salve qualquer conversa ou análise em PDF com layout profissional, pronto para enviar ao cliente ou arquivar no processo.',
    detail: 'Cabeçalho com dados do escritório',
    href: '/dashboard/chat', cta: 'Abrir chat',
  },
  {
    id: 'historico', icon: Clock, color: 'purple',
    title: 'Histórico de Conversas',
    description: 'Todas as suas consultas ficam salvas e organizadas. Retome qualquer conversa anterior quando precisar — nada se perde.',
    detail: 'Busca dentro do histórico de sessões',
    href: '/dashboard/chat', cta: 'Ver histórico',
  },
  {
    id: 'api', icon: Code, color: 'orange',
    title: 'API REST Documentada',
    description: 'Integre o LegalAI em seu site, CRM ou sistema interno. API REST completa com Swagger interativo para testes em tempo real.',
    detail: 'Swagger disponível em /api/docs',
    href: '/dashboard/api', cta: 'Ver API docs',
  },
  {
    id: 'apikeys', icon: Key, color: 'yellow',
    title: 'Chaves de API',
    description: 'Crie e gerencie múltiplas chaves de acesso com prefixo identificador. Revogue ou renove a qualquer momento sem downtime.',
    detail: 'Segurança com hash argon2 — nunca armazena a chave em claro',
    href: '/dashboard/api', cta: 'Gerenciar chaves',
  },
  {
    id: 'multiusuario', icon: Users, color: 'pink',
    title: 'Multi-usuário por Escritório',
    description: 'Compartilhe o acesso com toda sua equipe. Defina perfis de Admin e Usuário com permissões diferenciadas.',
    detail: 'Ideal para escritórios com múltiplos advogados',
    href: '/dashboard', cta: 'Ver painel',
  },
  {
    id: 'metricas', icon: BarChart2, color: 'lime',
    title: 'Métricas de Uso',
    description: 'Acompanhe tokens consumidos, consultas realizadas e custos por período. Gestão de créditos de IA em tempo real.',
    detail: 'Breakdown por endpoint e período',
    href: '/dashboard', cta: 'Ver painel',
  },
];

// ─── Steps ──────────────────────────────────────────────────────────────────
// 0 = welcome, 1-15 = features, 16 = done
const TOTAL_STEPS = 17;
const FEATURE_STEPS = FEATURES.length; // 15

function StepWelcome({ trial, onNext }: { trial: TrialData; onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center">
        <Scale className="w-8 h-8 text-brand-400" />
      </div>
      <div>
        <h2 className="text-slate-100 text-2xl font-bold mb-3">
          Bem-vindo ao LegalAI, {trial.prefix} {trial.name}! 👋
        </h2>
        <p className="text-slate-400 text-base max-w-md">
          Você tem 24 horas para explorar <strong className="text-slate-200">15 funcionalidades</strong> que vão transformar sua prática jurídica.
        </p>
      </div>
      <CountdownBadge expiresAt={trial.expiresAt} />
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-xs text-slate-500">
        {['IA Jurídica', 'Busca Semântica', 'Upload Docs', 'Fontes Auto', 'Calc. Honorários', 'API & mais'].map((f) => (
          <div key={f} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
            <CheckCircle className="w-3 h-3 text-brand-500 shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors text-base"
      >
        Começar tour →
      </button>
    </div>
  );
}

function StepFeature({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const c = COLOR_MAP[feature.color];
  const Icon = feature.icon;
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-14 h-14 ${c.bg} border ${c.border} rounded-2xl flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${c.icon}`} />
        </div>
        <div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge} mb-2 inline-block`}>
            Funcionalidade {index} de {FEATURE_STEPS}
          </span>
          <h2 className="text-slate-100 text-xl font-bold mt-2">{feature.title}</h2>
          <p className="text-slate-400 text-sm max-w-sm mt-2 leading-relaxed">{feature.description}</p>
        </div>
      </div>

      {/* Detail pill */}
      <div className="flex justify-center">
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${c.border} ${c.bg}`}>
          <span className={c.icon}>✦</span>
          <span className="text-slate-400">{feature.detail}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Link
          href={feature.href}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors text-sm"
        >
          {feature.cta}
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function StepDone({ trial }: { trial: TrialData }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-slate-100 text-2xl font-bold mb-2">Tour completo!</h2>
        <p className="text-slate-400">
          Você conheceu todas as 15 funcionalidades, {trial.prefix} {trial.name}.<br />
          Agora explore à vontade durante as próximas 24 horas.
        </p>
      </div>
      <CountdownBadge expiresAt={trial.expiresAt} />

      {/* Feature recap grid */}
      <div className="grid grid-cols-3 gap-2 w-full text-xs">
        {FEATURES.map((f) => {
          const c = COLOR_MAP[f.color];
          const Icon = f.icon;
          return (
            <Link
              key={f.id}
              href={f.href}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border ${c.border} ${c.bg} hover:opacity-80 transition-opacity`}
            >
              <Icon className={`w-4 h-4 ${c.icon}`} />
              <span className="text-slate-400 text-center leading-tight" style={{ fontSize: '10px' }}>{f.title.split(' ').slice(0, 3).join(' ')}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link
          href="/dashboard"
          className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors text-sm text-center"
        >
          Ir para o Dashboard →
        </Link>
        <a
          href="https://wa.me/5513997708569?text=Ol%C3%A1%2C%20Edu!%20Estou%20testando%20o%20LegalAI%20e%20tenho%20d%C3%BAvidas!"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 font-semibold rounded-xl transition-colors text-sm text-center"
        >
          Falar com a equipe
        </a>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [trialId, setTrialId] = useState<string | null>(null);

  const track = useCallback(
    (event: string, page?: string, element?: string) => {
      if (!trialId) return;
      apiClient.trackTrialMetric(trialId, { event, page, element }).catch(() => {});
    },
    [trialId],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRIAL_KEY);
      if (raw) {
        const parsed: TrialData = JSON.parse(raw);
        setTrial(parsed);
        setTrialId(parsed.id);
      }
      const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY);
      if (savedStep) {
        const n = parseInt(savedStep, 10);
        if (!isNaN(n) && n >= 0 && n < TOTAL_STEPS) setStep(n);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !trialId) return;
    const stepName = step === 0 ? 'welcome' : step === TOTAL_STEPS - 1 ? 'done' : FEATURES[step - 1].id;
    track('page_view', `/trial/onboarding/${stepName}`);
  }, [step, loaded, trialId]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (s: number, element?: string) => {
    const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, s));
    if (element) {
      const stepName = step === 0 ? 'welcome' : step === TOTAL_STEPS - 1 ? 'done' : FEATURES[step - 1].id;
      track('click', `/trial/onboarding/${stepName}`, element);
    }
    setStep(clamped);
    try { localStorage.setItem(ONBOARDING_STEP_KEY, String(clamped)); } catch {}
  };

  const next = () => goTo(step + 1, 'btn_next');
  const prev = () => goTo(step - 1, 'btn_prev');

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!trial) {
    router.replace('/trial');
    return null;
  }

  const isWelcome = step === 0;
  const isDone = step === TOTAL_STEPS - 1;
  const isFeature = !isWelcome && !isDone;
  const featureIndex = isFeature ? step - 1 : 0; // 0-based index into FEATURES
  const progressPct = isFeature ? (step / FEATURE_STEPS) * 100 : isDone ? 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/8 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo + skip */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-brand-400" />
            </div>
            <span className="text-slate-100 font-bold text-lg">LegalAI</span>
          </div>
          {!isDone && (
            <button
              onClick={() => goTo(TOTAL_STEPS - 1, 'btn_skip')}
              className="text-slate-600 hover:text-slate-400 text-sm transition-colors"
            >
              Pular tour →
            </button>
          )}
        </div>

        {/* Progress bar (feature steps only) */}
        {isFeature && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs">Funcionalidade {step} de {FEATURE_STEPS}</span>
              <span className="text-slate-500 text-xs">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {/* Dot indicators */}
            <div className="flex gap-1 mt-3 justify-center flex-wrap">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i + 1)}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === step ? 'w-4 bg-brand-500' : i + 1 < step ? 'w-1.5 bg-brand-700' : 'w-1.5 bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-8">
          {isWelcome && <StepWelcome trial={trial} onNext={next} />}
          {isFeature && <StepFeature feature={FEATURES[featureIndex]} index={step} />}
          {isDone && <StepDone trial={trial} />}
        </div>

        {/* Navigation */}
        {isFeature && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prev}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {step < FEATURE_STEPS ? 'Próxima' : 'Concluir'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
