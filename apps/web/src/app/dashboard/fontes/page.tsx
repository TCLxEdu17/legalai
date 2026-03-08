'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Globe,
  Play,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const sourceSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  description: z.string().optional(),
  baseUrl: z.string().url('URL inválida'),
  sourceType: z.enum(['html-list', 'sitemap', 'rss', 'custom']),
  scheduleCron: z.string().default('0 2 * * *'),
  isActive: z.boolean().default(true),
  listSelector: z.string().optional(),
  contentSelector: z.string().optional(),
  maxPages: z.coerce.number().min(1).max(20).default(3),
});

type SourceForm = z.infer<typeof sourceSchema>;

const SOURCE_TYPE_LABELS: Record<string, string> = {
  'html-list': 'Lista HTML',
  sitemap: 'Sitemap XML',
  rss: 'Feed RSS/Atom',
  custom: 'Customizado',
};

const CRON_PRESETS = [
  { label: 'Diário às 2h', value: '0 2 * * *' },
  { label: 'A cada 6h', value: '0 */6 * * *' },
  { label: 'Semanal (Dom 3h)', value: '0 3 * * 0' },
  { label: 'Quinzenal', value: '0 2 1,15 * *' },
];

export default function FontesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SourceForm>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { sourceType: 'html-list', scheduleCron: '0 2 * * *', isActive: true, maxPages: 3 },
  });

  const sourceType = watch('sourceType');

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => apiClient.getSources(),
  });

  const createMutation = useMutation({
    mutationFn: (data: SourceForm) =>
      apiClient.createSource({
        name: data.name,
        description: data.description,
        baseUrl: data.baseUrl,
        sourceType: data.sourceType,
        scheduleCron: data.scheduleCron,
        isActive: data.isActive,
        configJson: {
          listSelector: data.listSelector,
          contentSelector: data.contentSelector,
          maxPages: data.maxPages,
        },
      }),
    onSuccess: () => {
      toast.success('Fonte criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      setShowForm(false);
      reset();
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.updateSource(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteSource(id),
    onSuccess: () => {
      toast.success('Fonte removida');
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => apiClient.runSource(id),
    onSuccess: () => {
      toast.success('Ingestão iniciada. Acompanhe em Histórico de Ingestões.');
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const onSubmit = (data: SourceForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fontes Automáticas</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure fontes externas para atualização automática da base de jurisprudências.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); reset(); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Fonte
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-[#111118] border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-100 mb-5">
            {editingId ? 'Editar Fonte' : 'Nova Fonte de Ingestão'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome da fonte *</label>
                <input
                  {...register('name')}
                  className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-600"
                  placeholder="STJ — Jurisprudências"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de coletor *</label>
                <select
                  {...register('sourceType')}
                  className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">URL base *</label>
                <input
                  {...register('baseUrl')}
                  className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-600"
                  placeholder="https://www.stj.jus.br/..."
                />
                {errors.baseUrl && <p className="text-red-400 text-xs mt-1">{errors.baseUrl.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
                <input
                  {...register('description')}
                  className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-600"
                  placeholder="Jurisprudências do Superior Tribunal de Justiça"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Agendamento (cron)</label>
                <select
                  onChange={(e) => setValue('scheduleCron', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
                  ))}
                </select>
              </div>

              {sourceType === 'html-list' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Seletor de links (CSS)</label>
                    <input
                      {...register('listSelector')}
                      className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-600"
                      placeholder="a.resultado-ementa"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Seletor de conteúdo (CSS)</label>
                    <input
                      {...register('contentSelector')}
                      className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-600"
                      placeholder=".texto-ementa"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Máximo de páginas</label>
                    <input
                      type="number"
                      {...register('maxPages')}
                      min={1}
                      max={20}
                      className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} id="isActive" className="w-4 h-4" />
                <label htmlFor="isActive" className="text-sm text-slate-400">Fonte ativa (coleta automática habilitada)</label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-white/5 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar Fonte
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); }}
                className="px-4 py-2 border border-white/10 text-slate-400 hover:bg-white/[0.04] rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de fontes */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Carregando fontes...
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 bg-[#111118] border border-white/[0.07] rounded-xl">
          <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Nenhuma fonte configurada</p>
          <p className="text-slate-500 text-sm mt-1">
            Adicione uma fonte externa para iniciar a coleta automática.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source: any) => (
            <div key={source.id} className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    source.isActive ? 'bg-emerald-400' : 'bg-slate-600',
                  )} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 truncate">{source.name}</p>
                    <p className="text-xs text-slate-500 truncate">{source.baseUrl}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="hidden sm:inline-flex items-center px-2.5 py-1 bg-white/5 text-slate-400 text-xs rounded-full font-medium">
                    {SOURCE_TYPE_LABELS[source.sourceType] || source.sourceType}
                  </span>

                  {source.lastJob && (
                    <span className={cn(
                      'hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium',
                      source.lastJob.status === 'COMPLETED' && 'bg-emerald-500/15 text-emerald-400',
                      source.lastJob.status === 'PARTIAL' && 'bg-amber-500/15 text-amber-400',
                      source.lastJob.status === 'FAILED' && 'bg-red-500/15 text-red-400',
                      source.lastJob.status === 'RUNNING' && 'bg-brand-600/15 text-brand-400',
                    )}>
                      {source.lastJob.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                      {source.lastJob.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                      {source.lastJob.status === 'RUNNING' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {source.lastJob.status === 'PARTIAL' && <AlertCircle className="w-3 h-3" />}
                      {source.lastJob.itemsIndexed} indexados
                    </span>
                  )}

                  <button
                    onClick={() => runMutation.mutate(source.id)}
                    disabled={runMutation.isPending}
                    title="Executar agora"
                    className="p-2 text-slate-500 hover:text-brand-400 hover:bg-brand-600/10 rounded-lg transition-colors"
                  >
                    {runMutation.isPending && runMutation.variables === source.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleMutation.mutate({ id: source.id, isActive: !source.isActive })}
                    title={source.isActive ? 'Desativar' : 'Ativar'}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      source.isActive
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-slate-500 hover:bg-white/[0.04]',
                    )}
                  >
                    {source.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => deleteMutation.mutate(source.id)}
                    title="Remover fonte"
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                    className="p-2 text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
                  >
                    {expandedSource === source.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedSource === source.id && (
                <div className="border-t border-white/[0.05] p-4 bg-[#0d0d15] grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Agendamento</p>
                    <p className="text-sm text-slate-300 font-mono">{source.scheduleCron}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Última execução</p>
                    <p className="text-sm text-slate-300">
                      {source.lastRunAt ? formatRelativeTime(source.lastRunAt) : 'Nunca executado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Último sucesso</p>
                    <p className="text-sm text-slate-300">
                      {source.lastSuccessAt ? formatRelativeTime(source.lastSuccessAt) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total de jobs</p>
                    <p className="text-sm text-slate-300">{source.totalJobs || 0}</p>
                  </div>
                  {source.description && (
                    <div className="col-span-2 md:col-span-4">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Descrição</p>
                      <p className="text-sm text-slate-300">{source.description}</p>
                    </div>
                  )}
                  {source.lastJob?.errorMessage && (
                    <div className="col-span-2 md:col-span-4">
                      <p className="text-xs text-red-400 font-medium uppercase tracking-wide mb-1">Último erro</p>
                      <p className="text-sm text-red-500 font-mono text-xs">{source.lastJob.errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
