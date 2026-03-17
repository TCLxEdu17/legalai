'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, AlertTriangle, ThumbsUp, ThumbsDown, CreditCard, MessageCircle, Scale } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

const WA_URL =
  'https://wa.me/5513997708569?text=Ol%C3%A1%2C%20Eduardo!%20Acabei%20de%20testar%20o%20LegalAI%20e%20quero%20saber%20mais%20sobre%20os%20planos!';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatCountdown(ms: number) {
  if (ms <= 0) return { h: '00', m: '00', s: '00', total: 0 };
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h: pad(h), m: pad(m), s: pad(s), total };
}

type FeedbackState = 'idle' | 'sending' | 'done';

export function TrialCountdown() {
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [trialId, setTrialId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.trialId || !user?.trialExpiresAt) return;
    setTrialId(user.trialId);
    setExpiresAt(new Date(user.trialExpiresAt));
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = expiresAt.getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) setIsExpired(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const submitFeedback = useCallback(
    async (liked: boolean) => {
      if (!trialId || feedbackState !== 'idle') return;
      setFeedbackState('sending');
      try {
        await apiClient.submitTrialFeedback(trialId, liked ? 'YES' : 'NO');
      } catch {}
      setFeedbackState('done');
    },
    [trialId, feedbackState],
  );

  if (!expiresAt) return null;

  const { h, m, s, total } = formatCountdown(remaining);
  const isWarning = total > 0 && total < 3600;
  const isCritical = total > 0 && total < 600;

  return (
    <>
      {/* ── Countdown bar ── */}
      {!isExpired && (
        <div
          className={`flex items-center gap-2 px-3 py-2 text-xs border-b shrink-0 ${
            isCritical
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : isWarning
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
          }`}
        >
          {isCritical ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="font-medium">
            Período de teste expira em:{' '}
            <span className="font-mono font-bold">
              {h}:{m}:{s}
            </span>
          </span>
        </div>
      )}

      {/* ── Trial expired — upgrade modal ── */}
      {isExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Header gradient */}
            <div className="bg-gradient-to-br from-brand-600/20 via-[#141414] to-violet-600/10 p-8 text-center border-b border-white/[0.07]">
              <div className="w-14 h-14 mx-auto mb-4 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center">
                <Scale className="w-7 h-7 text-brand-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">
                Seu período de teste encerrou
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Você explorou o LegalAI por 24 horas.
                <br />
                Pronto para transformar sua prática jurídica?
              </p>
            </div>

            {/* CTAs */}
            <div className="p-6 space-y-3">
              <button
                onClick={() => router.push('/dashboard/planos')}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                <CreditCard className="w-4 h-4" />
                Assinar um plano agora
              </button>

              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Falar com Eduardo no WhatsApp
              </a>

              {/* Feedback toggle */}
              {!showFeedback && feedbackState === 'idle' && (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="w-full py-2 text-slate-600 hover:text-slate-400 text-xs transition-colors"
                >
                  Deixar feedback sobre o teste →
                </button>
              )}

              {showFeedback && feedbackState === 'idle' && (
                <div className="pt-1">
                  <p className="text-slate-500 text-xs text-center mb-3">O que achou do LegalAI?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => submitFeedback(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium transition-colors"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Gostei muito!
                    </button>
                    <button
                      onClick={() => submitFeedback(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 text-slate-400 rounded-xl text-xs font-medium transition-colors"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      Não era o que esperava
                    </button>
                  </div>
                </div>
              )}

              {feedbackState === 'sending' && (
                <p className="text-center text-xs text-slate-500 animate-pulse">Registrando...</p>
              )}

              {feedbackState === 'done' && (
                <p className="text-center text-xs text-emerald-400">Obrigado pelo feedback!</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
