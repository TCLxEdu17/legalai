'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StickyNote, Save, CheckCheck, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function NotasPage() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['user-notes'],
    queryFn: () => apiClient.getNotes(),
  });

  useEffect(() => {
    if (data?.notes !== undefined) {
      setContent(data.notes);
    }
  }, [data?.notes]);

  const mutation = useMutation({
    mutationFn: (notes: string) => apiClient.saveNotes(notes),
    onSuccess: () => {
      setSaved(true);
      queryClient.setQueryData(['user-notes'], { notes: content });
    },
  });

  const triggerSave = useCallback(
    (text: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => mutation.mutate(text), 1200);
    },
    [mutation],
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);
    setSaved(false);
    triggerSave(val);
  }

  function handleSaveNow() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    mutation.mutate(content);
  }

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="h-full flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/15 border border-yellow-500/25 rounded-xl flex items-center justify-center shrink-0">
            <StickyNote className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Bloco de Notas</h1>
            <p className="text-slate-500 text-sm">Anotações pessoais — salvas automaticamente</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-600">
            {wordCount} palavras · {charCount} caracteres
          </span>
          <button
            onClick={handleSaveNow}
            disabled={mutation.isPending || saved}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              bg-yellow-500/10 text-yellow-400 border border-yellow-500/20
              hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {mutation.isPending ? 'Salvando...' : saved ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col">
        {/* Toolbar hint */}
        <div className="px-4 py-2 border-b border-white/[0.05] flex items-center gap-2">
          <span className="text-slate-700 text-xs">Suporta Markdown — use **negrito**, *itálico*, # título, - lista</span>
          {!saved && !mutation.isPending && (
            <span className="ml-auto flex items-center gap-1 text-amber-500 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Não salvo
            </span>
          )}
          {mutation.isPending && (
            <span className="ml-auto flex items-center gap-1 text-slate-500 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando...
            </span>
          )}
          {saved && !mutation.isPending && (
            <span className="ml-auto flex items-center gap-1 text-emerald-500 text-xs">
              <CheckCheck className="w-3 h-3" />
              Salvo
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-600 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando notas...
          </div>
        ) : (
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Escreva suas anotações aqui...

Exemplos de uso:
- Estratégias para casos em andamento
- Jurisprudências relevantes
- Lembretes importantes
- Rascunhos de argumentos"
            className="flex-1 w-full bg-transparent text-slate-200 text-sm leading-relaxed
              p-5 resize-none outline-none placeholder:text-slate-700
              font-mono min-h-[500px]"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
