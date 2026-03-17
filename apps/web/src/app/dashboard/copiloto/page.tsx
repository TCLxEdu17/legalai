'use client';

import { useState } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Bot,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Zap,
  BarChart3,
  FolderOpen,
  Calculator,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const TIPOS_COMUNS = [
  'Negativação indevida',
  'Cobrança indevida',
  'Acidente de trânsito',
  'Erro médico',
  'Dano ao consumidor',
  'Assédio moral no trabalho',
  'Demissão sem justa causa',
  'Acidente de trabalho',
  'Atraso de voo / cancelamento',
  'Falha na prestação de serviço',
  'Invasão de privacidade',
  'Dano estético',
];

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
}

export default function CopilotoPage() {
  const router = useRouter();
  const [radarEnabled, setRadarEnabled] = useState(false);

  // Calculadora de indenização
  const [calcForm, setCalcForm] = useState({ tipo: '', estado: 'SP', duracao: '', detalhes: '' });
  const [calcResult, setCalcResult] = useState<any>(null);

  const { data: copilot, isLoading: copilotLoading, refetch: refetchCopilot, isFetching } = useQuery({
    queryKey: ['office-copilot'],
    queryFn: () => apiClient.getOfficeCopilot(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    meta: { onError: (e: unknown) => toast.error(extractApiErrorMessage(e)) },
  });

  const { data: radar, isLoading: radarLoading, refetch: refetchRadar } = useQuery({
    queryKey: ['cases-radar'],
    queryFn: () => apiClient.getCasesRadar(),
    enabled: radarEnabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    meta: { onError: (e: unknown) => toast.error(extractApiErrorMessage(e)) },
  });

  const compensationMutation = useMutation({
    mutationFn: () => apiClient.predictCompensation({
      tipo: calcForm.tipo,
      estado: calcForm.estado,
      duracao: calcForm.duracao || undefined,
      detalhes: calcForm.detalhes || undefined,
    }),
    onSuccess: (data) => setCalcResult(data),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] overflow-y-auto">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600/15 border border-brand-500/20 rounded-xl">
              <Bot className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-slate-100 font-semibold">Copiloto do Escritório</h1>
              <p className="text-slate-500 text-xs mt-0.5">Visão geral inteligente de todos os seus casos</p>
            </div>
          </div>
          <button
            onClick={() => { refetchCopilot(); if (radarEnabled) refetchRadar(); }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 text-xs rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {copilotLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <PlanetLoader size="xs" />
              <p className="text-slate-500 text-sm">Analisando seu portfólio...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            {copilot?.stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Total de Casos</p>
                  <p className="text-2xl font-bold text-slate-100">{copilot.stats.total ?? 0}</p>
                </div>
                {Object.entries(copilot.stats.porStatus ?? {}).map(([status, count]) => (
                  <div key={status} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">{status}</p>
                    <p className="text-2xl font-bold text-slate-100">{count as number}</p>
                  </div>
                ))}
                {(copilot.stats.semDocumentos ?? 0) > 0 && (
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                    <p className="text-xs text-yellow-500 mb-1">Sem Documentos</p>
                    <p className="text-2xl font-bold text-yellow-400">{copilot.stats.semDocumentos}</p>
                  </div>
                )}
              </div>
            )}

            {/* Prazos Urgentes */}
            {(copilot?.prazosUrgentes?.length ?? 0) > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-red-400" />
                  <h2 className="text-slate-200 text-sm font-medium">Prazos Urgentes ({copilot.prazosUrgentes.length})</h2>
                </div>
                <div className="space-y-2">
                  {copilot.prazosUrgentes.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/10 rounded-lg cursor-pointer transition-all"
                      onClick={() => item.caseId && router.push(`/dashboard/casos/${item.caseId}`)}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', {
                        'bg-red-500': item.urgencia === 'critica',
                        'bg-orange-400': item.urgencia === 'alta',
                        'bg-yellow-400': item.urgencia === 'media',
                      })} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm font-medium truncate">{item.titulo}</p>
                        <p className="text-slate-500 text-xs">{item.prazo}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Casos Alto Risco */}
            {(copilot?.casosAltoRisco?.length ?? 0) > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <h2 className="text-slate-200 text-sm font-medium">Casos de Alto Risco ({copilot.casosAltoRisco.length})</h2>
                </div>
                <div className="space-y-2">
                  {copilot.casosAltoRisco.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/10 rounded-lg cursor-pointer transition-all"
                      onClick={() => item.caseId && router.push(`/dashboard/casos/${item.caseId}`)}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', {
                        'bg-red-500': item.nivel === 'critico',
                        'bg-orange-400': item.nivel === 'alto',
                        'bg-yellow-400': item.nivel === 'medio',
                      })} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm font-medium truncate">{item.titulo}</p>
                        <p className="text-slate-500 text-xs">{item.risco}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações Recomendadas */}
            {(copilot?.acoesRecomendadas?.length ?? 0) > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-brand-400" />
                  <h2 className="text-slate-200 text-sm font-medium">Ações Recomendadas ({copilot.acoesRecomendadas.length})</h2>
                </div>
                <div className="space-y-2">
                  {copilot.acoesRecomendadas.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/10 rounded-lg cursor-pointer transition-all"
                      onClick={() => item.caseId && router.push(`/dashboard/casos/${item.caseId}`)}
                    >
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0', {
                        'bg-red-500/10 text-red-400': item.prioridade === 'alta',
                        'bg-yellow-500/10 text-yellow-400': item.prioridade === 'media',
                        'bg-slate-500/10 text-slate-400': item.prioridade === 'baixa',
                      })}>{item.prioridade}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm font-medium truncate">{item.titulo}</p>
                        <p className="text-slate-500 text-xs">{item.acao}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {copilot && !copilot.prazosUrgentes?.length && !copilot.casosAltoRisco?.length && !copilot.acoesRecomendadas?.length && (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <FolderOpen className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Nenhum alerta ou ação pendente identificada</p>
                <p className="text-slate-700 text-xs mt-1">Seu escritório está em dia</p>
              </div>
            )}

            {/* Radar de Oportunidades */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-slate-200 text-sm font-medium">Radar de Oportunidades</h2>
                </div>
                {!radarEnabled ? (
                  <button
                    onClick={() => setRadarEnabled(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Ativar Radar
                  </button>
                ) : (
                  <button
                    onClick={() => refetchRadar()}
                    disabled={radarLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 text-xs rounded-lg transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', radarLoading && 'animate-spin')} />
                    Atualizar
                  </button>
                )}
              </div>

              {!radarEnabled && (
                <p className="text-slate-600 text-sm">Analise padrões entre casos para identificar oportunidades estratégicas no portfólio.</p>
              )}

              {radarLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <PlanetLoader size="xs" />
                  Analisando padrões...
                </div>
              )}

              {radar?.oportunidades?.length > 0 && (
                <div className="space-y-3">
                  {radar.oportunidades.map((op: any, i: number) => (
                    <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', {
                            'bg-red-500/10 text-red-400': op.prioridade === 'alta',
                            'bg-yellow-500/10 text-yellow-400': op.prioridade === 'media',
                            'bg-slate-500/10 text-slate-400': op.prioridade === 'baixa',
                          })}>{op.prioridade}</span>
                          <span className="text-[10px] text-slate-600">{op.tipo}</span>
                        </div>
                        <span className="text-xs text-slate-500">{op.afetados} caso{op.afetados !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-slate-300 text-sm font-medium mb-1">{op.padrao}</p>
                      <p className="text-slate-400 text-xs">{op.recomendacao}</p>
                      {op.caseIds?.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {op.caseIds.map((cid: string) => (
                            <button
                              key={cid}
                              onClick={() => router.push(`/dashboard/casos/${cid}`)}
                              className="text-[10px] px-2 py-0.5 bg-brand-600/10 border border-brand-500/20 text-brand-400 rounded hover:bg-brand-600/20 transition-colors"
                            >
                              Ver caso
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {radar && radar.oportunidades?.length === 0 && (
                <p className="text-slate-500 text-sm">Nenhum padrão identificado no portfólio atual.</p>
              )}
            </div>

            {/* Calculadora de Indenização */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Calculator className="w-4 h-4 text-violet-400" />
                <h2 className="text-slate-200 text-sm font-medium">Previsão de Valor de Indenização</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Tipo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1.5">Tipo de caso</label>
                  <input
                    type="text"
                    list="tipos-comuns"
                    placeholder="Ex: negativação indevida"
                    value={calcForm.tipo}
                    onChange={(e) => setCalcForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all"
                  />
                  <datalist id="tipos-comuns">
                    {TIPOS_COMUNS.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Estado</label>
                  <select
                    value={calcForm.estado}
                    onChange={(e) => setCalcForm(f => ({ ...f, estado: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all appearance-none"
                  >
                    {ESTADOS_BR.map(uf => <option key={uf} value={uf} className="bg-[#1a1a1a]">{uf}</option>)}
                  </select>
                </div>

                {/* Duração */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Duração (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 3 meses, 1 ano"
                    value={calcForm.duracao}
                    onChange={(e) => setCalcForm(f => ({ ...f, duracao: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all"
                  />
                </div>

                {/* Detalhes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1.5">Detalhes adicionais (opcional)</label>
                  <textarea
                    placeholder="Contexto relevante para afinar a estimativa..."
                    value={calcForm.detalhes}
                    onChange={(e) => setCalcForm(f => ({ ...f, detalhes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => compensationMutation.mutate()}
                disabled={!calcForm.tipo.trim() || compensationMutation.isPending}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {compensationMutation.isPending ? (
                  <><PlanetLoader size="xs" />Calculando...</>
                ) : (
                  <><Calculator className="w-4 h-4" />Calcular Previsão</>
                )}
              </button>

              {/* Resultado */}
              {calcResult && (
                <div className="mt-5 space-y-4">
                  {/* Faixa principal */}
                  <div className="p-5 bg-violet-600/8 border border-violet-500/20 rounded-xl text-center">
                    <p className="text-xs text-violet-400/70 mb-2 uppercase tracking-wider">Valor médio da indenização</p>
                    <p className="text-3xl font-bold text-violet-300">
                      {calcResult.faixa?.texto ?? `${formatBRL(calcResult.faixa?.minimo ?? 0)} – ${formatBRL(calcResult.faixa?.maximo ?? 0)}`}
                    </p>
                    {calcResult.valorMedio > 0 && (
                      <p className="text-xs text-slate-500 mt-1">Média: {formatBRL(calcResult.valorMedio)}</p>
                    )}
                    <p className="text-[11px] text-slate-600 mt-2 flex items-center justify-center gap-1">
                      <Info className="w-3 h-3" />
                      Baseado em jurisprudência real dos tribunais brasileiros
                    </p>
                  </div>

                  {/* Fundamentação */}
                  {calcResult.fundamentacao && (
                    <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <p className="text-xs text-slate-500 mb-1.5">Fundamentação</p>
                      <p className="text-slate-300 text-sm leading-relaxed">{calcResult.fundamentacao}</p>
                    </div>
                  )}

                  {/* Fatores */}
                  <div className="grid grid-cols-2 gap-3">
                    {calcResult.fatoresQueAumentam?.length > 0 && (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          <p className="text-xs text-emerald-400 font-medium">Aumentam o valor</p>
                        </div>
                        <ul className="space-y-1">
                          {calcResult.fatoresQueAumentam.map((f: string, i: number) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                              <span className="text-emerald-500/50 mt-0.5">•</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {calcResult.fatoresQueReduzem?.length > 0 && (
                      <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ArrowDown className="w-3.5 h-3.5 text-red-400" />
                          <p className="text-xs text-red-400 font-medium">Reduzem o valor</p>
                        </div>
                        <ul className="space-y-1">
                          {calcResult.fatoresQueReduzem.map((f: string, i: number) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                              <span className="text-red-500/50 mt-0.5">•</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Precedentes */}
                  {calcResult.precedentes?.length > 0 && (
                    <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <p className="text-xs text-slate-500 mb-3">Precedentes relevantes</p>
                      <div className="space-y-2">
                        {calcResult.precedentes.map((p: any, i: number) => (
                          <div key={i} className="flex items-start justify-between gap-2 p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 leading-relaxed">{p.observacao}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-medium text-slate-300">
                                {p.valorMinimo === p.valorMaximo
                                  ? formatBRL(p.valorMinimo)
                                  : `${formatBRL(p.valorMinimo)} – ${formatBRL(p.valorMaximo)}`}
                              </p>
                              <p className="text-[10px] text-slate-600">{p.tribunal} · {p.ano}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  {calcResult.observacoes && (
                    <p className="text-xs text-slate-600 flex items-start gap-1.5">
                      <Info className="w-3 h-3 mt-0.5 shrink-0" />
                      {calcResult.observacoes}
                    </p>
                  )}

                  {/* Recalcular */}
                  <button
                    onClick={() => setCalcResult(null)}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    Limpar resultado
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
