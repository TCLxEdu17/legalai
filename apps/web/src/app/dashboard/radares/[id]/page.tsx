'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Radio, ArrowLeft, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { PlanetLoader } from '@/components/ui/planet-loader';

type Tab = 'alertas' | 'configuracoes';

export default function RadarDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = params;
  const [tab, setTab] = useState<Tab>('alertas');
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [impactResults, setImpactResults] = useState<Record<string, string>>({});
  const [configForm, setConfigForm] = useState<any>(null);

  // TanStack Query v5: onSuccess removed. Use useEffect to initialize configForm.
  const { data: radar, isLoading: loadingRadar } = useQuery({
    queryKey: ['radar', id],
    queryFn: () => apiClient.getRadar(id),
  });

  useEffect(() => {
    if (radar && !configForm) {
      setConfigForm({
        title: (radar as any).title,
        thesisText: (radar as any).thesisText,
        threshold: (radar as any).threshold,
        isActive: (radar as any).isActive,
        caseId: (radar as any).caseId ?? '',
      });
    }
  }, [radar]);

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['radar-alerts', id],
    queryFn: () => apiClient.getRadarAlerts(id),
    enabled: tab === 'alertas',
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases(),
  });

  const markReadMutation = useMutation({
    mutationFn: (alertId: string) => apiClient.markRadarAlertRead(id, alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['radar-alerts', id] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateRadar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radar', id] });
      queryClient.invalidateQueries({ queryKey: ['radars'] });
      toast.success('Radar atualizado');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const handleAnalyze = async (alertId: string) => {
    setAnalyzingId(alertId);
    try {
      const { impactAnalysis } = await apiClient.analyzeRadarAlert(id, alertId);
      setImpactResults((prev) => ({ ...prev, [alertId]: impactAnalysis }));
      queryClient.invalidateQueries({ queryKey: ['radar-alerts', id] });
    } catch (e) {
      toast.error(extractApiErrorMessage(e));
    } finally {
      setAnalyzingId(null);
    }
  };

  if (loadingRadar) {
    return <div className="flex items-center justify-center h-64"><PlanetLoader size="md" /></div>;
  }

  if (!radar) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/dashboard/radares')}
            className="mt-1 p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-brand-600/15 border border-brand-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Radio className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-100 truncate">{(radar as any).title}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                (radar as any).isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400',
              )}>
                {(radar as any).isActive ? 'Ativo' : 'Inativo'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-400 border border-brand-500/20">
                {Math.round((radar as any).threshold * 100)}% similaridade
              </span>
              {(radar as any).case && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                  {(radar as any).case.title}
                </span>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.05}>
        <div className="flex gap-1 bg-[#111111] border border-white/[0.06] rounded-xl p-1">
          {(['alertas', 'configuracoes'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize',
                tab === t
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {t === 'alertas' ? 'Alertas' : 'Configurações'}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Tab: Alertas */}
      {tab === 'alertas' && (
        loadingAlerts ? (
          <div className="flex items-center justify-center h-40"><PlanetLoader size="sm" /></div>
        ) : (alerts as any[]).length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mb-4">
                <Radio className="w-6 h-6 text-slate-700" />
              </div>
              <p className="text-slate-400 font-medium text-sm">Nenhum alerta ainda</p>
              <p className="text-slate-600 text-xs mt-1">Alertas aparecerão aqui quando novas decisões relevantes forem ingeridas.</p>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {(alerts as any[]).map((alert: any) => {
              const isUnread = !alert.readAt;
              const summaryExpanded = expandedSummary === alert.id;
              const impactText = impactResults[alert.id] || alert.impactAnalysis;

              return (
                <StaggerItem key={alert.id}>
                  <div
                    className={cn(
                      'bg-[#141414] border rounded-xl p-5 transition-all',
                      isUnread ? 'border-brand-500/30' : 'border-white/[0.07]',
                    )}
                    onClick={() => isUnread && markReadMutation.mutate(alert.id)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnread && <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />}
                        {alert.document.tribunal && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.07] text-slate-400 font-medium">
                            {alert.document.tribunal}
                          </span>
                        )}
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                          alert.similarity >= 0.9 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-600/20 text-brand-400',
                        )}>
                          {Math.round(alert.similarity * 100)}% match
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-slate-200 text-sm font-medium mb-1">{alert.document.title}</h4>
                    {alert.document.cleanedText && (
                      <p className="text-slate-500 text-xs line-clamp-2 mb-3">{alert.document.cleanedText.slice(0, 200)}...</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {alert.summary && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedSummary(summaryExpanded ? null : alert.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/20 text-brand-400 text-xs rounded-lg transition-all"
                        >
                          {summaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          Ver resumo
                        </button>
                      )}
                      {!impactText && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAnalyze(alert.id); }}
                          disabled={analyzingId === alert.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {analyzingId === alert.id ? <PlanetLoader size="xs" /> : <Sparkles className="w-3 h-3" />}
                          Analisar impacto
                        </button>
                      )}
                    </div>

                    {summaryExpanded && alert.summary && (
                      <div className="mt-3 p-3 bg-brand-600/5 border border-brand-500/15 rounded-lg">
                        <p className="text-slate-300 text-xs leading-relaxed">{alert.summary}</p>
                      </div>
                    )}

                    {impactText && (
                      <div className="mt-3 p-3 bg-violet-500/5 border border-violet-500/15 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-violet-400" />
                          <span className="text-[10px] text-violet-400 font-medium">Análise de impacto</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">{impactText}</p>
                      </div>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )
      )}

      {/* Tab: Configurações */}
      {tab === 'configuracoes' && configForm && (
        <FadeIn>
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Título</label>
              <input
                value={configForm.title}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Tese jurídica</label>
              <textarea
                value={configForm.thesisText}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, thesisText: e.target.value }))}
                rows={4}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all resize-none"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">
                Limiar de similaridade — <span className="text-brand-400 font-semibold">{Math.round(configForm.threshold * 100)}%</span>
              </label>
              <input
                type="range" min={60} max={100} step={5}
                value={Math.round(configForm.threshold * 100)}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, threshold: Number(e.target.value) / 100 }))}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Caso associado</label>
              <select
                value={configForm.caseId}
                onChange={(e) => setConfigForm((f: any) => ({ ...f, caseId: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
              >
                <option value="">Nenhum</option>
                {(cases as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 text-sm">Radar ativo</span>
              <button
                onClick={() => setConfigForm((f: any) => ({ ...f, isActive: !f.isActive }))}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  configForm.isActive ? 'bg-emerald-500' : 'bg-slate-700',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  configForm.isActive ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
            </div>
            <button
              onClick={() => updateMutation.mutate({ ...configForm, caseId: configForm.caseId || null })}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {updateMutation.isPending ? <PlanetLoader size="xs" /> : <Check className="w-4 h-4" />}
              Salvar alterações
            </button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
