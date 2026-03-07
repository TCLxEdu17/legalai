'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Upload,
  Globe,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

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
  COMPLETED: { label: 'Concluído', icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50' },
  PARTIAL: { label: 'Parcial', icon: AlertCircle, cls: 'text-amber-600 bg-amber-50' },
  FAILED: { label: 'Falhou', icon: XCircle, cls: 'text-red-600 bg-red-50' },
  RUNNING: { label: 'Executando', icon: Loader2, cls: 'text-blue-600 bg-blue-50' },
  PENDING: { label: 'Aguardando', icon: Clock, cls: 'text-slate-600 bg-slate-100' },
};

export default function IngestoesPage() {
  const [page, setPage] = useState(1);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['ingestion-jobs', page],
    queryFn: () => apiClient.getIngestionJobs({ page, limit }),
    placeholderData: (prev) => prev,
  });

  const jobs: any[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Histórico de Ingestões</h1>
        <p className="text-slate-500 text-sm mt-1">
          Registro de todas as execuções de ingestão, manuais e automáticas.
        </p>
      </div>

      {/* Stats rápidas */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total de Jobs', value: pagination.total, cls: 'text-slate-900' },
            {
              label: 'Concluídos',
              value: jobs.filter((j) => j.status === 'COMPLETED').length,
              cls: 'text-emerald-600',
            },
            {
              label: 'Com erros',
              value: jobs.filter((j) => j.status === 'FAILED' || j.status === 'PARTIAL').length,
              cls: 'text-red-600',
            },
            {
              label: 'Itens indexados',
              value: jobs.reduce((sum: number, j: any) => sum + j.itemsIndexed, 0),
              cls: 'text-brand-600',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-1">{stat.label}</p>
              <p className={cn('text-2xl font-bold', stat.cls)}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Carregando jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum job de ingestão ainda</p>
            <p className="text-slate-400 text-sm mt-1">
              Configure fontes automáticas ou faça upload manual de documentos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job: any) => {
              const statusCfg = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedJob === job.id;

              return (
                <div key={job.id}>
                  <div
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  >
                    {/* Origem */}
                    <div className="shrink-0">
                      {job.triggerType === 'MANUAL' || job.sourceType === 'MANUAL' ? (
                        <div title="Manual" className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Upload className="w-4 h-4 text-slate-500" />
                        </div>
                      ) : (
                        <div title="Automático" className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                          <Globe className="w-4 h-4 text-brand-600" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
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
                        <p className="text-sm font-medium text-slate-700">{job.itemsFound}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Indexados</p>
                        <p className="text-sm font-medium text-emerald-600">{job.itemsIndexed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Ignorados</p>
                        <p className="text-sm font-medium text-slate-500">{job.itemsSkipped}</p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expandido: logs e itens */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
                      {/* Métricas detalhadas mobile */}
                      <div className="grid grid-cols-4 gap-3 sm:hidden">
                        {[
                          { label: 'Encontrados', value: job.itemsFound },
                          { label: 'Processados', value: job.itemsProcessed },
                          { label: 'Indexados', value: job.itemsIndexed, cls: 'text-emerald-600' },
                          { label: 'Ignorados', value: job.itemsSkipped },
                        ].map((m) => (
                          <div key={m.label} className="text-center">
                            <p className={cn('text-lg font-bold', m.cls || 'text-slate-700')}>{m.value}</p>
                            <p className="text-xs text-slate-500">{m.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Erro */}
                      {job.errorMessage && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-red-700 mb-1">Erro</p>
                          <p className="text-xs text-red-600 font-mono">{job.errorMessage}</p>
                        </div>
                      )}

                      {/* Logs */}
                      {job.logsJson && Array.isArray(job.logsJson) && job.logsJson.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Log de execução</p>
                          <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {(job.logsJson as string[]).map((log, i) => (
                              <p key={i} className="text-xs font-mono text-slate-300 leading-relaxed">{log}</p>
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
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-50 hover:bg-slate-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-600">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages || isFetching}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-50 hover:bg-slate-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
