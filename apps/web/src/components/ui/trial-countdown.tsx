'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, ThumbsUp, ThumbsDown, X, AlertTriangle } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

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
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [trialId, setTrialId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [feedbackDone, setFeedbackDone] = useState(false);

  // Load trial info from stored user
  useEffect(() => {
    const user = getStoredUser();
    if (!user?.trialId || !user?.trialExpiresAt) return;
    setTrialId(user.trialId);
    setExpiresAt(new Date(user.trialExpiresAt));
  }, []);

  // Tick
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = expiresAt.getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) setShowFeedback(true);
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
        setFeedbackState('done');
        setTimeout(() => setFeedbackDone(true), 1500);
      } catch {
        setFeedbackState('done');
        setTimeout(() => setFeedbackDone(true), 1500);
      }
    },
    [trialId, feedbackState],
  );

  // Not a trial user
  if (!expiresAt) return null;

  const { h, m, s, total } = formatCountdown(remaining);
  const isExpired = remaining <= 0;
  const isWarning = total > 0 && total < 3600; // last hour
  const isCritical = total > 0 && total < 600; // last 10 min

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

      {/* ── Feedback modal ── */}
      {showFeedback && !feedbackDone && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative bg-[#141414] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl">
            {/* Close (só após dar feedback ou se já enviou) */}
            {feedbackState === 'done' && (
              <button
                onClick={() => setFeedbackDone(true)}
                className="absolute top-4 right-4 text-slate-600 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="p-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Clock className="w-7 h-7 text-indigo-400" />
              </div>

              <h2 className="text-xl font-bold text-slate-100 mb-2">
                Seu período de teste encerrou
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Esperamos que você tenha aproveitado o LegalAI.
                <br />
                Gostaria de nos contar o que achou?
              </p>

              {feedbackState === 'idle' && (
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => submitFeedback(true)}
                    className="flex-1 flex flex-col items-center gap-2 py-5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl transition-all group"
                  >
                    <ThumbsUp className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-emerald-300">Gostei muito!</span>
                  </button>
                  <button
                    onClick={() => submitFeedback(false)}
                    className="flex-1 flex flex-col items-center gap-2 py-5 px-4 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 hover:border-slate-500/50 rounded-xl transition-all group"
                  >
                    <ThumbsDown className="w-7 h-7 text-slate-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-slate-400">Não era o que esperava</span>
                  </button>
                </div>
              )}

              {feedbackState === 'sending' && (
                <div className="py-6 text-slate-400 text-sm animate-pulse">
                  Registrando feedback...
                </div>
              )}

              {feedbackState === 'done' && (
                <div className="py-4 space-y-2">
                  <p className="text-emerald-400 font-semibold text-base">
                    Obrigado pelo feedback!
                  </p>
                  <p className="text-slate-500 text-sm">
                    Para continuar usando o LegalAI, entre em contato com nossa equipe.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
