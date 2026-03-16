'use client';

import { useState, useEffect, useRef } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Upload,
  Globe,
  Wrench,
  Database,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    prevTarget.current = target;
    startRef.current = null;
    const from = value;
    const range = target - from;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + eased * range));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

function formatDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}min`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

const STATUS_CONFIG = {
  COMPLETED: { label: 'Concluído', icon: CheckCircle, cls: 'text-emerald-400 bg-emerald-500/15' },
  PARTIAL: { label: 'Parcial', icon: AlertCircle, cls: 'text-amber-400 bg-amber-500/15' },
  FAILED: { label: 'Falhou', icon: XCircle, cls: 'text-red-400 bg-red-500/15' },
  RUNNING: { label: 'Executando', icon: cls: 'text-brand-400 bg-brand-600/15' },
  PENDING: { label: 'Aguardando', icon: Clock, cls: 'text-slate-400 bg-white/5' },
};

function StatCard({
  label, value, icon: Icon, iconBg, iconColor, valueColor, suffix,
}: {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; valueColor: string; suffix?: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="dark-card rounded-xl p-4 hover:border-white/[0.14] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-xs font-medium">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', valueColor)}>
        {animated.toLocaleString('pt-BR')}{suffix}
      </p>
    </div>
  );
}

function StatsRow({ total, completed, failed, indexed }: {
  total: number; completed: number; failed: number; indexed: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Total de Jobs"   value={total}     icon={Activity}    iconBg="bg-slate-500/15"   iconColor="text-slate-400"   valueColor="text-slate-100" />
      <StatCard label="Concluídos"      value={completed} icon={CheckCircle} iconBg="bg-emerald-500/15" iconColor="text-emerald-400" valueColor="text-emerald-400" />
      <StatCard label="Com erros"       value={failed}    icon={XCircle}     iconBg="bg-red-500/15"     iconColor="text-red-400"     valueColor="text-red-400" />
      <StatCard label="Itens indexados" value={indexed}   icon={Database}    iconBg="bg-brand-600/15"   iconColor="text-brand-400"   valueColor="text-brand-400" />
    </div>
  );
}

export default function IngestoesPage() {
  const [page, setPage] = useState(1);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['ingestion-jobs', page],
    queryFn: () => apiClient.getIngestionJobs({ page, limit }),
    placeholderData: (prev) => prev,
  });

  const cleanupMutation = useMutation({
    mutationFn: () => apiClient.cleanupOrphanedJobs(),
    onSuccess: (res) => {
      toast.success(`${res.count} jobs órfãos resolvidos`);
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
    },
    onError: () => toast.error('Erro ao resolver jobs órfãos'),
  });

  const jobs: any[] = data?.data || [];
  const pagination = data?.pagination;
  const stats = data?.stats as { byStatus: Record<string, number>; totalIndexed: number } | undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Histórico de Ingestões</h1>
          <p className="text-slate-500 text-sm mt-1">
            Registro de todas as execuções de ingestão, manuais e automáticas.
          </p>
        </div>
        {(stats?.byStatus?.RUNNING ?? 0) > 0 && (
          <button
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm hover:bg-amber-500/20 transition-colors disabled:opacity-60"
          >
            {cleanupMutation.isPending ? (
              <PlanetLoader size="xs" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
            Resolver {stats?.byStatus?.RUNNING ?? 0} jobs presos
          </button>
        )}
      </div>

      {/* Stats rápidas */}
      {pagination && (
        <StatsRow
          total={pagination.total}
          completed={(stats?.byStatus?.COMPLETED ?? 0) + (stats?.byStatus?.PARTIAL ?? 0)}
          failed={stats?.byStatus?.FAILED ?? 0}
          indexed={stats?.totalIndexed ?? 0}
        />
      )}

      {/* Tabela */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">
            <PlanetLoader size="sm" />
            Carregando jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhum job de ingestão ainda</p>
            <p className="text-slate-500 text-sm mt-1">
              Configure fontes automáticas ou faça upload manual de documentos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {jobs.map((job: any) => {
              const statusCfg = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedJob === job.id;

              return (
                <div key={job.id}>
                  <div
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.04] cursor-pointer"
                    onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  >
                    {/* Origem */}
                    <div className="shrink-0">
                      {job.triggerType === 'MANUAL' || job.sourceType === 'MANUAL' ? (
                        <div title="Manual" className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                          <Upload className="w-4 h-4 text-slate-400" />
                        </div>
                      ) : (
                        <div title="Automático" className="w-8 h-8 bg-brand-600/15 rounded-lg flex items-center justify-center">
                          <Globe className="w-4 h-4 text-brand-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {job.source?.name || (job.sourceType === 'MANUAL' ? 'Upload Manual' : 'Ingestão Automática')}
                        </p>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                          statusCfg.cls,
                        )}>
                          <StatusIcon className={cn('w-3 h-3', job.status === 'RUNNING' && 'animate-spin')} />
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(job.createdAt)} · Duração: {formatDuration(job.startedAt, job.finishedAt)}
                      </p>
                    </div>

                    {/* Métricas */}
                    <div className="hidden sm:flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <p className="text-xs text-slate-500">Encontrados</p>
                        <p className="text-sm font-medium text-slate-300">{job.itemsFound}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Indexados</p>
                        <p className="text-sm font-medium text-emerald-400">{job.itemsIndexed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Ignorados</p>
                        <p className="text-sm font-medium text-slate-500">{job.itemsSkipped}</p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expandido: logs e itens */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.05] bg-[#0f0f0f] px-4 py-4 space-y-3">
                      {/* Métricas detalhadas mobile */}
                      <div className="grid grid-cols-4 gap-3 sm:hidden">
                        {[
                          { label: 'Encontrados', value: job.itemsFound },
                          { label: 'Processados', value: job.itemsProcessed },
                          { label: 'Indexados', value: job.itemsIndexed, cls: 'text-emerald-400' },
                          { label: 'Ignorados', value: job.itemsSkipped },
                        ].map((m) => (
                          <div key={m.label} className="text-center">
                            <p className={cn('text-lg font-bold', m.cls || 'text-slate-300')}>{m.value}</p>
                            <p className="text-xs text-slate-500">{m.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Erro */}
                      {job.errorMessage && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-xs font-medium text-red-400 mb-1">Erro</p>
                          <p className="text-xs text-red-500 font-mono">{job.errorMessage}</p>
                        </div>
                      )}

                      {/* Logs */}
                      {job.logsJson && Array.isArray(job.logsJson) && job.logsJson.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Log de execução</p>
                          <div className="bg-[#080810] border border-white/5 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {(job.logsJson as string[]).map((log, i) => (
                              <p key={i} className="text-xs font-mono text-slate-400 leading-relaxed">{log}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {pagination.total} jobs no total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-sm text-slate-400 disabled:opacity-50 hover:bg-white/[0.04]"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-500">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages || isFetching}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-sm text-slate-400 disabled:opacity-50 hover:bg-white/[0.04]"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
