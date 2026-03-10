'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scale,
  MessageSquare,
  FileText,
  Upload,
  Key,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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
    <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2">
      <Clock className="w-4 h-4 text-brand-400" />
      <span className="text-slate-400 text-sm">Tempo restante:</span>
      <span className="text-brand-400 font-mono font-bold">{formatCountdown(remaining)}</span>
    </div>
  );
}

// ─── Step content components ───────────────────────────────────────────────

function StepWelcome({ trial, onNext }: { trial: TrialData; onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 fade-in-up">
      <div className="w-16 h-16 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center">
        <Scale className="w-8 h-8 text-brand-400" />
      </div>
      <div>
        <h2 className="text-slate-100 text-2xl font-bold mb-3">
          Bem-vindo ao LegalAI, {trial.prefix} {trial.name}! 👋
        </h2>
        <p className="text-slate-400 text-base max-w-md">
          Você tem 24 horas para explorar todas as funcionalidades. Vamos fazer um tour rápido?
        </p>
      </div>
      <CountdownBadge expiresAt={trial.expiresAt} />
      <button
        onClick={onNext}
        className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors text-base"
      >
        Começar tour →
      </button>
    </div>
  );
}

function StepChat() {
  return (
    <div className="fade-in-up">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare className="w-7 h-7 text-brand-400" />
        </div>
        <h2 className="text-slate-100 text-2xl font-bold mb-2">Assistente Jurídico</h2>
        <p className="text-slate-400 text-sm max-w-md">
          O Assistente Jurídico responde perguntas baseadas na sua base de jurisprudência com
          precisão e contexto.
        </p>
      </div>

      {/* Mock chat */}
      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-5 mb-6 space-y-4">
        <div className="flex justify-end">
          <div className="bg-brand-600/20 border border-brand-500/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs">
            <p className="text-slate-200 text-sm">
              Qual o prazo para recurso em processo trabalhista?
            </p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm">
            <p className="text-slate-300 text-sm leading-relaxed">
              De acordo com a CLT, Art. 6º-C, o prazo para recurso ordinário é de{' '}
              <strong className="text-slate-100">8 dias corridos</strong> a partir da intimação da
              decisão...
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Link
          href="/dashboard/chat"
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2"
        >
          Tentar agora
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function StepSearch() {
  return (
    <div className="fade-in-up">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-violet-400" />
        </div>
        <h2 className="text-slate-100 text-2xl font-bold mb-2">Busca de Jurisprudências</h2>
        <p className="text-slate-400 text-sm max-w-md">
          Busque em toda a sua base de documentos indexados com busca semântica — encontra o que
          você quer mesmo com palavras diferentes.
        </p>
      </div>

      {/* Mock search */}
      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4">
          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-slate-400 text-sm">prazo prescricional trabalhista</span>
        </div>
        <div className="space-y-3">
          {[
            {
              title: 'TST - RR 1234-56.2022.5.01.0001',
              snippet: 'Prescrição bienal. Art. 7º, XXIX da CF/88 — prazo de 2 anos após extinção...',
            },
            {
              title: 'TRT2 - RO 9876-43.2021.5.02.0032',
              snippet: 'Interrupção da prescrição. Ajuizamento de ação anterior interrompe o prazo...',
            },
          ].map((r) => (
            <div key={r.title} className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
              <p className="text-brand-400 text-xs font-medium mb-1">{r.title}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{r.snippet}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Link
          href="/dashboard/jurisprudencias"
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2"
        >
          Explorar
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function StepUpload() {
  return (
    <div className="fade-in-up">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-4">
          <Upload className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-slate-100 text-2xl font-bold mb-2">Upload de Documentos</h2>
        <p className="text-slate-400 text-sm max-w-md">
          Faça upload de acórdãos, doutrinas e peças em PDF, DOCX ou TXT e eles serão
          automaticamente indexados.
        </p>
      </div>

      {/* Mock upload zone */}
      <div className="bg-white/[0.04] border-2 border-dashed border-white/10 rounded-2xl p-10 mb-4 flex flex-col items-center gap-3">
        <Upload className="w-10 h-10 text-slate-600" />
        <p className="text-slate-500 text-sm">Arraste arquivos aqui ou clique para selecionar</p>
        <p className="text-slate-700 text-xs">PDF, DOCX, TXT — até 50 MB</p>
      </div>

      <p className="text-slate-500 text-xs text-center mb-5">
        Os documentos são automaticamente indexados e ficam disponíveis no chat em minutos.
      </p>

      <div className="flex justify-center">
        <Link
          href="/dashboard/upload"
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2"
        >
          Fazer upload
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function StepApi() {
  return (
    <div className="fade-in-up">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 bg-amber-600/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-4">
          <Key className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-slate-100 text-2xl font-bold mb-2">API & Integração</h2>
        <p className="text-slate-400 text-sm max-w-md">
          Integre o LegalAI em seus próprios sistemas com nossa API REST documentada.
        </p>
      </div>

      {/* Mock API key */}
      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-5 mb-4">
        <p className="text-slate-500 text-xs font-medium mb-2">Sua API Key (exemplo)</p>
        <div className="flex items-center gap-3 bg-black/30 border border-white/8 rounded-xl px-4 py-3">
          <Key className="w-4 h-4 text-amber-400 shrink-0" />
          <code className="text-amber-300 text-sm font-mono tracking-wide">
            lk_trial_xxxx••••••••••••••••
          </code>
        </div>
        <p className="text-slate-600 text-xs mt-3">
          Use no header:{' '}
          <code className="bg-white/5 px-1.5 py-0.5 rounded text-slate-400">
            Authorization: Bearer lk_trial_...
          </code>
        </p>
      </div>

      <p className="text-slate-500 text-xs text-center mb-5">
        Construímos sistemas personalizados para o seu escritório. Fale conosco!
      </p>

      <div className="flex justify-center">
        <Link
          href="/dashboard/api"
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2"
        >
          Ver API
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function StepDone({ trial }: { trial: TrialData }) {
  return (
    <div className="fade-in-up flex flex-col items-center text-center gap-6">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-slate-100 text-2xl font-bold mb-2">Tour concluído!</h2>
        <p className="text-slate-400 text-base">Agora explore à vontade, {trial.prefix} {trial.name}.</p>
      </div>
      <CountdownBadge expiresAt={trial.expiresAt} />
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

// ─── Steps config ──────────────────────────────────────────────────────────

const TOTAL_STEPS = 6; // 0=welcome, 1=chat, 2=search, 3=upload, 4=api, 5=done

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

  const STEP_NAMES = ['welcome', 'chat', 'search', 'upload', 'api', 'done'];

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

  // Track page view on step change
  useEffect(() => {
    if (!loaded || !trialId) return;
    track('page_view', `/trial/onboarding/${STEP_NAMES[step] ?? step}`);
  }, [step, loaded, trialId]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (s: number, element?: string) => {
    const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, s));
    if (element) track('click', `/trial/onboarding/${STEP_NAMES[step] ?? step}`, element);
    setStep(clamped);
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY, String(clamped));
    } catch {}
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
    // No trial data — redirect to trial creation
    router.replace('/trial');
    return null;
  }

  const isFirst = step === 0;
  const isLast = step === TOTAL_STEPS - 1;
  // Progress bar: exclude welcome (step 0) and done (last), show steps 1–4
  const progressSteps = TOTAL_STEPS - 2; // steps 1..4
  const progressIndex = Math.max(0, step - 1);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/8 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
            <Scale className="w-4 h-4 text-brand-400" />
          </div>
          <span className="text-slate-100 font-bold text-lg">LegalAI</span>
        </div>

        {/* Progress bar (shown on steps 1–4) */}
        {!isFirst && !isLast && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs">
                Passo {step} de {progressSteps}
              </span>
              <span className="text-slate-500 text-xs">{Math.round((progressIndex / progressSteps) * 100)}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${(progressIndex / progressSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="dark-card rounded-2xl p-8">
          {step === 0 && <StepWelcome trial={trial} onNext={next} />}
          {step === 1 && <StepChat />}
          {step === 2 && <StepSearch />}
          {step === 3 && <StepUpload />}
          {step === 4 && <StepApi />}
          {step === 5 && <StepDone trial={trial} />}
        </div>

        {/* Navigation (skip welcome step 0 — it has its own button; skip done step) */}
        {!isFirst && !isLast && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prev}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 text-slate-400 hover:text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
