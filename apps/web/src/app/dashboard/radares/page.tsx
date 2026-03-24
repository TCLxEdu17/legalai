'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Radio, Plus, Search, Trash2, ChevronRight, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';
import { FadeIn, StaggerContainer, StaggerItem, InteractiveCard } from '@/components/ui/motion';
import { PlanetLoader } from '@/components/ui/planet-loader';

const emptyForm = { title: '', thesisText: '', threshold: 0.8, caseId: '' };

export default function RadaresPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: radars = [], isLoading } = useQuery({
    queryKey: ['radars'],
    queryFn: () => apiClient.getRadars(),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases(),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createRadar({
      title: form.title,
      thesisText: form.thesisText,
      threshold: form.threshold,
      caseId: form.caseId || undefined,
    }),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ['radars'] });
      toast.success('Radar criado com sucesso');
      setShowModal(false);
      setForm(emptyForm);
      router.push(`/dashboard/radares/${created.id}`);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.updateRadar(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['radars'] }),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteRadar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radars'] });
      toast.success('Radar removido');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const filtered = radars.filter((r: any) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.thesisText.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600/15 border border-brand-500/20 rounded-xl flex items-center justify-center">
              <Radio className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Meus Radares</h1>
              <p className="text-slate-500 text-sm">
                {radars.filter((r: any) => r.isActive).length} ativo{radars.filter((r: any) => r.isActive).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Radar
          </button>
        </div>
      </FadeIn>

      {/* Search */}
      <FadeIn delay={0.1}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou tese..."
            className="w-full bg-[#141414] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
          />
        </div>
      </FadeIn>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <PlanetLoader size="sm" />
        </div>
      ) : filtered.length === 0 ? (
        <FadeIn delay={0.15}>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mb-4">
              <Radio className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-300 font-medium">Nenhum radar encontrado</p>
            <p className="text-slate-600 text-sm mt-1 max-w-xs">
              {search ? 'Tente outros termos.' : 'Crie um radar para monitorar decisões relevantes à sua tese.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/20 text-brand-400 text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro radar
              </button>
            )}
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((r: any) => {
            const unread = r._count?.alerts ?? 0;
            return (
              <StaggerItem key={r.id}>
                <InteractiveCard
                  className="group bg-[#141414] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.14] hover:bg-[#161616] transition-all cursor-pointer"
                  onClick={() => router.push(`/dashboard/radares/${r.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium',
                          r.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400',
                        )}>
                          {r.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-400 border border-brand-500/20">
                          {Math.round(r.threshold * 100)}% similaridade
                        </span>
                        {r.case && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 truncate max-w-[120px]">
                            {r.case.title}
                          </span>
                        )}
                        {unread > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                            {unread} novo{unread > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <h3 className="text-slate-100 font-semibold text-sm">{r.title}</h3>
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{r.thesisText}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: r.id, isActive: !r.isActive }); }}
                        className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all"
                        title={r.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {r.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remover o radar "${r.title}"?`)) deleteMutation.mutate(r.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                </InteractiveCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-slate-100 font-semibold">Novo Radar</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Título do radar *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Dano Moral por Negativação Indevida"
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Tese jurídica *</label>
                <textarea
                  value={form.thesisText}
                  onChange={(e) => setForm((f) => ({ ...f, thesisText: e.target.value }))}
                  placeholder="Descreva a tese que você quer monitorar em linguagem natural..."
                  rows={3}
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">
                  Limiar de similaridade — <span className="text-brand-400 font-semibold">{Math.round(form.threshold * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={5}
                  value={Math.round(form.threshold * 100)}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) / 100 }))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>60% (amplo)</span>
                  <span>100% (preciso)</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Caso associado (opcional)</label>
                <select
                  value={form.caseId}
                  onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                >
                  <option value="">Nenhum</option>
                  {cases.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/[0.06]">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.title.trim() || !form.thesisText.trim() || createMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
              >
                {createMutation.isPending ? <PlanetLoader size="xs" /> : <Plus className="w-4 h-4" />}
                Criar Radar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
