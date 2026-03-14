'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ClipboardCheck, Loader2, Copy, Trash2, AlertTriangle, BookOpen, Lightbulb, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage } from '@/lib/utils';

interface ReviewSection {
  type: 'inconsistencias' | 'fundamentacao' | 'lacunas' | 'sugestoes' | 'other';
  title: string;
  content: string;
}

function parseReview(text: string): ReviewSection[] {
  const sections: ReviewSection[] = [];
  const patterns = [
    { regex: /1\)\s*inconsistências?[^:]*:?/i, type: 'inconsistencias' as const, title: 'Inconsistências Jurídicas' },
    { regex: /2\)\s*erros?[^:]*fundament[^:]*:?/i, type: 'fundamentacao' as const, title: 'Erros de Fundamentação' },
    { regex: /3\)\s*lacunas?[^:]*:?/i, type: 'lacunas' as const, title: 'Lacunas Argumentativas' },
    { regex: /4\)\s*sugestões?[^:]*:?/i, type: 'sugestoes' as const, title: 'Sugestões de Melhoria' },
  ];

  let remaining = text;
  const splits: { index: number; type: ReviewSection['type']; title: string }[] = [];

  for (const { regex, type, title } of patterns) {
    const match = regex.exec(remaining);
    if (match) {
      splits.push({ index: text.indexOf(match[0]), type, title });
    }
  }

  splits.sort((a, b) => a.index - b.index);

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].index;
    const end = i + 1 < splits.length ? splits[i + 1].index : text.length;
    const content = text.slice(start, end).replace(/^\d+\)[^\n]*/m, '').trim();
    sections.push({ type: splits[i].type, title: splits[i].title, content });
  }

  if (sections.length === 0) {
    sections.push({ type: 'other', title: 'Análise', content: text });
  }

  return sections;
}

const SECTION_STYLES: Record<ReviewSection['type'], { border: string; bg: string; text: string; icon: React.ElementType }> = {
  inconsistencias: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', icon: AlertTriangle },
  fundamentacao: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', icon: BookOpen },
  lacunas: { border: 'border-brand-500/30', bg: 'bg-brand-600/5', text: 'text-brand-400', icon: Sparkles },
  sugestoes: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', icon: Lightbulb },
  other: { border: 'border-white/10', bg: 'bg-white/[0.03]', text: 'text-slate-400', icon: ClipboardCheck },
};

export default function RevisorPage() {
  const [text, setText] = useState('');
  const [review, setReview] = useState<string | null>(null);

  const reviewMutation = useMutation({
    mutationFn: () => apiClient.reviewPeca(text),
    onSuccess: (data) => setReview(data.review),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const copyReview = () => {
    if (review) {
      navigator.clipboard.writeText(review);
      toast.success('Revisão copiada!');
    }
  };

  const clear = () => {
    setText('');
    setReview(null);
  };

  const sections = review ? parseReview(review) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-brand-400" />
          Revisor de Peças Processuais
        </h1>
        <p className="text-slate-500 text-sm mt-1">Cole sua peça processual e receba análise jurídica detalhada com IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Peça processual</label>
            <span className="text-xs text-slate-500">{text.length} caracteres</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui a peça processual a ser revisada (petição inicial, contestação, recurso, etc.)"
            rows={20}
            className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-xl
                       placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={() => reviewMutation.mutate()}
              disabled={text.length < 50 || reviewMutation.isPending}
              className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              {reviewMutation.isPending ? 'Revisando...' : 'Revisar'}
            </button>
            <button onClick={clear} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-sm transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Review output */}
        <div>
          {reviewMutation.isPending && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-xl shimmer" />
              ))}
            </div>
          )}
          {review && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Resultado da revisão</span>
                <button onClick={copyReview} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                  Copiar revisão
                </button>
              </div>
              {sections.map((section, i) => {
                const style = SECTION_STYLES[section.type];
                const Icon = style.icon;
                return (
                  <div key={i} className={`border ${style.border} ${style.bg} rounded-xl p-4`}>
                    <div className={`flex items-center gap-2 ${style.text} font-medium text-sm mb-2`}>
                      <Icon className="w-4 h-4" />
                      {section.title}
                    </div>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{section.content}</p>
                  </div>
                );
              })}
            </div>
          )}
          {!review && !reviewMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center bg-[#141414] border border-white/[0.07] rounded-xl">
              <ClipboardCheck className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">Aguardando revisão</p>
              <p className="text-slate-500 text-sm mt-1">Cole sua peça e clique em "Revisar"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
