'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Scale, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage } from '@/lib/utils';
import { CookieBanner } from '@/components/ui/cookie-banner';

const TRIAL_KEY = 'legalai_trial';

interface TrialData {
  id: string;
  prefix: string;
  name: string;
  username: string;
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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
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

function FeedbackModal({
  trialId,
  onClose,
}: {
  trialId: string;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  const handleYes = async () => {
    window.open(
      'https://wa.me/5513997708569?text=Ol%C3%A1%2C%20Edu!%20Gostei%20do%20teste%20do%20LegalAI!%20Quais%20os%20pr%C3%B3ximos%20passos%3F',
      '_blank',
    );
    try {
      await apiClient.submitTrialFeedback(trialId, 'YES');
    } catch {}
    onClose();
  };

  const handleNo = async () => {
    try {
      await apiClient.submitTrialFeedback(trialId, 'NO');
    } catch {}
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl fade-in-up text-center">
        <div className="text-4xl mb-4">⏰</div>
        <h2 className="text-slate-100 text-xl font-bold mb-2">Seu período de teste encerrou!</h2>
        <p className="text-slate-400 text-sm mb-8">Gostou da experiência com o LegalAI?</p>

        {submitted ? (
          <p className="text-emerald-400 font-medium">Obrigado pelo feedback!</p>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleYes}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors text-lg"
            >
              Sim, adorei!
            </button>
            <button
              onClick={handleNo}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-colors text-lg border border-white/10"
            >
              Não foi para mim
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrialPage() {
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  // Creation form state
  const [prefix, setPrefix] = useState<'Dr.' | 'Dra.'>('Dr.');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UI state
  const [showFeedback, setShowFeedback] = useState(false);
  const [justCreated, setJustCreated] = useState(false);

  const remaining = useCountdown(trial?.expiresAt ?? null);
  const isExpired = trial !== null && remaining === 0;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRIAL_KEY);
      if (raw) {
        const parsed: TrialData = JSON.parse(raw);
        setTrial(parsed);
      }
    } catch {}
    setLoadedFromStorage(true);
  }, []);

  // Show feedback modal when trial expires
  useEffect(() => {
    if (isExpired && !showFeedback) {
      setShowFeedback(true);
    }
  }, [isExpired, showFeedback]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await apiClient.createTrial({ prefix, name: name.trim() });
      const data: TrialData = {
        id: result.id,
        prefix: result.prefix ?? prefix,
        name: result.name ?? name.trim(),
        username: result.username ?? '',
        email: result.email,
        password: result.password,
        expiresAt: result.expiresAt,
      };
      localStorage.setItem(TRIAL_KEY, JSON.stringify(data));
      setTrial(data);
      setJustCreated(true);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Don't render until we've checked localStorage (avoid flicker)
  if (!loadedFromStorage) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/8 blur-3xl rounded-full pointer-events-none" />

      {/* Feedback modal */}
      {showFeedback && trial && (
        <FeedbackModal trialId={trial.id} onClose={() => setShowFeedback(false)} />
      )}

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-brand-600/20 border border-brand-500/30 rounded-xl flex items-center justify-center mb-3">
            <Scale className="w-6 h-6 text-brand-400" />
          </div>
          <span className="text-slate-100 font-bold text-xl tracking-tight">LegalAI</span>
        </div>

        {/* ─── State 1: No trial → creation form ─── */}
        {!trial && (
          <div className="dark-card rounded-2xl p-8 fade-in-up">
            <h1 className="text-slate-100 text-2xl font-bold text-center mb-2 leading-tight">
              Experimente o LegalAI gratuitamente por 24 horas
            </h1>
            <p className="text-slate-400 text-sm text-center mb-8">
              Sem cartão de crédito. Acesso completo ao assistente jurídico com IA.
            </p>

            <form onSubmit={handleCreate} className="space-y-5">
              {/* Prefix selector */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-2 block">Tratamento</label>
                <div className="flex gap-3">
                  {(['Dr.', 'Dra.'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrefix(p)}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                        prefix === p
                          ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/8 hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name input */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-2 block">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base"
              >
                {loading ? 'Gerando acesso...' : 'Gerar meu acesso →'}
              </button>
            </form>

            <p className="text-slate-600 text-xs text-center mt-6">
              Ao continuar você concorda com nossos termos de uso.
            </p>
          </div>
        )}

        {/* ─── State 2: Just created → show credentials ─── */}
        {trial && justCreated && (
          <div className="dark-card rounded-2xl p-8 fade-in-up">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">✅</div>
              <h2 className="text-slate-100 text-xl font-bold">
                Acesso criado com sucesso, {trial.prefix} {trial.name}!
              </h2>
            </div>

            {/* Credentials */}
            <div className="space-y-3 mb-6">
              <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1.5 font-medium">E-mail</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-200 text-sm font-mono break-all">{trial.email}</span>
                  <CopyButton value={trial.email} />
                </div>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1.5 font-medium">Senha</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-200 text-sm font-mono">{trial.password}</span>
                  <CopyButton value={trial.password} />
                </div>
              </div>
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 mb-6 bg-white/[0.04] border border-white/8 rounded-xl py-3">
              <Clock className="w-4 h-4 text-brand-400" />
              <span className="text-slate-400 text-sm">Tempo restante:</span>
              <span className="text-brand-400 font-mono font-bold text-lg">
                {formatCountdown(remaining)}
              </span>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">
                Anote suas credenciais. A senha não será exibida novamente.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/trial/onboarding"
                className="block w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors text-base text-center"
              >
                Ver tour guiado →
              </Link>
              <Link
                href="/login"
                className="block w-full py-3 bg-white/5 hover:bg-white/8 border border-white/10 text-slate-300 font-medium rounded-xl transition-colors text-sm text-center"
              >
                Ir direto para o login
              </Link>
            </div>
          </div>
        )}

        {/* ─── State 3: Already has trial (not just created) ─── */}
        {trial && !justCreated && (
          <div className="dark-card rounded-2xl p-8 fade-in-up">
            <div className="text-center mb-6">
              <p className="text-slate-500 text-sm mb-1">Bem-vindo de volta,</p>
              <h2 className="text-slate-100 text-xl font-bold">
                {trial.prefix} {trial.name}
              </h2>
            </div>

            {isExpired ? (
              <div className="text-center">
                <p className="text-red-400 font-medium mb-4">Seu período de teste expirou.</p>
                <button
                  onClick={() => setShowFeedback(true)}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors"
                >
                  Deixar feedback
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-6 bg-white/[0.04] border border-white/8 rounded-xl py-3">
                  <Clock className="w-4 h-4 text-brand-400" />
                  <span className="text-slate-400 text-sm">Tempo restante:</span>
                  <span className="text-brand-400 font-mono font-bold text-lg">
                    {formatCountdown(remaining)}
                  </span>
                </div>
                <Link
                  href="/login"
                  className="block w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors text-base text-center"
                >
                  Entrar no sistema →
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <CookieBanner />
    </div>
  );
}
