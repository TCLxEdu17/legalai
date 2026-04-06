'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { MessageSquare, Bug, Lightbulb, Palette, Zap, HelpCircle, Send, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'feature', label: 'Solicitar funcionalidade', icon: Lightbulb },
  { value: 'ux', label: 'Problema de UX', icon: Palette },
  { value: 'performance', label: 'Performance', icon: Zap },
  { value: 'other', label: 'Outro', icon: HelpCircle },
];

const SEVERITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
];

export default function FeedbackPage() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bug');
  const [severity, setSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Por favor, descreva o problema.');
      return;
    }
    if (description.length < 20) {
      toast.error('Descreva o problema com pelo menos 20 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.submitFeedback({ description: description.trim(), category, severity });
      toast.success('Feedback enviado com sucesso! Obrigado pelo retorno.');
      setDescription('');
      setCategory('bug');
      setSeverity('medium');
    } catch (err) {
      toast.error('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600/20 border border-brand-500/30 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-slate-100 text-xl font-bold">Reportar Problema</h1>
          <p className="text-slate-500 text-sm">Nos ajude a melhorar o LegalAI</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-5">
        {/* Category */}
        <div>
          <label className="text-slate-400 text-xs font-medium mb-3 block">Categoria</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    category === c.value
                      ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/8 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="text-slate-400 text-xs font-medium mb-3 block">Severidade</label>
          <div className="flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSeverity(s.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${
                  severity === s.value
                    ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                    : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-slate-400 text-xs font-medium mb-2 block">
            Descricao do problema
            <span className="text-slate-600 ml-1">(min. 20 caracteres)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que aconteceu, o que esperava que acontecesse e como reproduzir o problema..."
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors resize-none"
          />
          <p className="text-slate-600 text-xs mt-1">{description.length}/500</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar feedback
            </>
          )}
        </button>
      </form>

      {/* WhatsApp fallback */}
      <div className="bg-[#141414] border border-emerald-500/20 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">💬</div>
        <p className="text-slate-400 text-sm mb-3">Prefere falar diretamente com a equipe?</p>
        <a
          href="https://wa.me/5513997708569?text=Olá, Edu! Tenho um feedback sobre o LegalAI!"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors text-sm"
        >
          Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
