'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Scale, RefreshCw, Search, Lock, ChevronLeft, ChevronRight,
  Bookmark, Inbox, Loader2, Wifi, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Process {
  number: string;
  classe: string;
  assunto: string;
  partes: string;
  dataAtualizacao: string;
}

interface OabProcessList {
  processes: Process[];
  total: number;
  page: number;
  hasMore: boolean;
}

function getRowBorderColor(index: number, dataAtualizacao: string): string {
  // Heuristic: recent (within ~30 days) = brand, no date = amber, old = slate
  if (!dataAtualizacao) return 'border-l-amber-500/60';
  const dateMatch = dataAtualizacao.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    const d = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);
    const daysAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 30) return 'border-l-brand-500';
    if (daysAgo < 90) return 'border-l-amber-500/60';
  }
  return 'border-l-slate-600/50';
}

function getStatusBadge(classe: string): { label: string; cls: string } | null {
  const lower = classe.toLowerCase();
  if (lower.includes('tutela') || lower.includes('liminar')) {
    return { label: 'Urgente', cls: 'bg-red-500/10 text-red-400' };
  }
  if (lower.includes('execuç') || lower.includes('execucao')) {
    return { label: 'Execução', cls: 'bg-amber-500/10 text-amber-400' };
  }
  if (lower.includes('recurso') || lower.includes('apelação') || lower.includes('apelacao')) {
    return { label: 'Recurso', cls: 'bg-purple-500/10 text-purple-400' };
  }
  return null;
}

export default function ProcessosPorOabPage() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching, refetch, error } = useQuery<OabProcessList>({
    queryKey: ['processos-por-oab', page],
    queryFn: () => apiClient.listProcessesByOab(page),
    retry: false,
  });

  const isPro = !(error && (error as any)?.response?.status === 403);
  const isNotConfigured = !!(error && (error as any)?.response?.status === 404);

  const processes = data?.processes ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const filtered = useMemo(() => {
    if (!filter.trim()) return processes;
    const q = filter.toLowerCase();
    return processes.filter(
      (p) =>
        p.number.toLowerCase().includes(q) ||
        p.classe.toLowerCase().includes(q) ||
        p.assunto.toLowerCase().includes(q) ||
        p.partes.toLowerCase().includes(q),
    );
  }, [processes, filter]);

  const toggleSave = (number: string) => {
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (next.has(number)) {
        next.delete(number);
        toast.success('Removido dos salvos');
      } else {
        next.add(number);
        toast.success('Processo salvo');
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success('Lista atualizada');
  };

  const isForbidden = !!(error && (error as any)?.response?.status === 403);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-600/10 border border-brand-500/15 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Processos por OAB</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Processos do TJSP vinculados ao seu número de OAB
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          Sincronizar
        </button>
      </div>

      {/* ── PRO banner ── */}
      {isForbidden && (
        <div className="rounded-xl p-5 flex items-center justify-between bg-gradient-to-r from-amber-600/8 via-[#141414] to-amber-600/8 border border-amber-500/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold text-sm uppercase tracking-widest">RECURSO PRO</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="text-slate-300 text-sm font-medium">Monitoramento em tempo real</span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Atualizações automáticas diárias disponíveis apenas no plano PRO.
              </p>
            </div>
          </div>
          <a
            href="/dashboard/planos"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-lg transition-all"
          >
            Fazer upgrade
          </a>
        </div>
      )}

      {/* ── Not configured banner ── */}
      {isNotConfigured && (
        <div className="rounded-xl p-5 flex items-center justify-between bg-[#141414] border border-white/[0.07]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-slate-200 font-medium text-sm">Credenciais OAB não configuradas</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Configure suas credenciais eSAJ em Configurações → OAB para usar este recurso.
              </p>
            </div>
          </div>
          <a
            href="/dashboard/configuracoes"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Configurar
          </a>
        </div>
      )}

      {/* ── Stats bar ── */}
      {!isForbidden && !isNotConfigured && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total de Processos</p>
            <p className="text-3xl font-bold text-slate-100 mt-2 tracking-tight">
              {isLoading ? '—' : total}
            </p>
          </div>
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Última atualização</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-3xl font-bold text-slate-100 tracking-tight">
                {isFetching ? <Loader2 className="w-6 h-6 animate-spin text-brand-400" /> : 'Agora'}
              </p>
            </div>
          </div>
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Status da Conexão</p>
            <div className="mt-4">
              {error ? (
                <span className="text-xs px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 inline-flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Erro de conexão
                </span>
              ) : (
                <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 inline-flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Conectado (eSAJ)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter + Refresh row ── */}
      {!isForbidden && !isNotConfigured && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por número, classe ou assunto..."
              className="w-full bg-[#111111] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-brand-600/20 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            Atualizar
          </button>
        </div>
      )}

      {/* ── Table card ── */}
      {!isForbidden && !isNotConfigured && (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Processo</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Classe</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Assunto</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Partes</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Última Movimentação</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {isLoading ? (
                  // Skeleton rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className={cn('border-l-2 border-l-white/10', i % 2 === 0 ? 'bg-[#0f0f0f]' : 'bg-[#111111]')}>
                      {[1, 2, 3, 4, 5].map((col) => (
                        <td key={col} className="px-4 py-3">
                          <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                        </td>
                      ))}
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Inbox className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">
                        {filter ? 'Nenhum processo encontrado para este filtro' : 'Nenhum processo encontrado'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((process, i) => {
                    const borderColor = getRowBorderColor(i, process.dataAtualizacao);
                    const badge = getStatusBadge(process.classe);
                    const isSaved = savedSet.has(process.number);

                    return (
                      <tr
                        key={process.number}
                        className={cn(
                          'border-l-2 transition-colors group cursor-pointer',
                          borderColor,
                          i % 2 === 0 ? 'bg-[#0f0f0f] hover:bg-white/[0.03]' : 'bg-[#111111] hover:bg-white/[0.03]',
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-brand-400 font-medium">
                            {process.number}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[160px]">{process.classe || '—'}</span>
                            {badge && (
                              <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter shrink-0', badge.cls)}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell max-w-[140px] truncate">
                          {process.assunto || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell max-w-[180px] truncate">
                          {process.partes || '—'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 hidden xl:table-cell">
                          <span className="italic">{process.dataAtualizacao || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSave(process.number); }}
                              className={cn(
                                'p-1.5 rounded-lg transition-all text-slate-500',
                                isSaved
                                  ? 'bg-amber-500/10 text-amber-400 opacity-100'
                                  : 'bg-white/5 opacity-0 group-hover:opacity-100 hover:text-amber-400',
                              )}
                              title={isSaved ? 'Remover dos salvos' : 'Salvar processo'}
                            >
                              <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-current')} />
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {!isForbidden && !isNotConfigured && !isLoading && total > 0 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 disabled:text-slate-700 disabled:cursor-not-allowed rounded-lg text-xs transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </button>
          <p className="text-xs text-slate-500 font-medium">
            Página <span className="text-slate-200">{page + 1}</span>
            {total > 0 && (
              <> · <span className="text-slate-200">{total}</span> processos</>
            )}
          </p>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 disabled:text-slate-700 disabled:cursor-not-allowed rounded-lg text-xs transition-colors"
          >
            Próximo
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
