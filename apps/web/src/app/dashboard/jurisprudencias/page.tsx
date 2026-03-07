'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Trash2, Eye, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import {
  formatDate,
  formatFileSize,
  getProcessingStatusLabel,
  extractApiErrorMessage,
  cn,
} from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import type { JurisprudenceDocument, PaginatedResponse, ProcessingStatus } from '@/types';

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  CHUNKING: 'bg-blue-100 text-blue-700',
  EMBEDDING: 'bg-violet-100 text-violet-700',
  INDEXED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function JurisprudenciasPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<JurisprudenceDocument | null>(null);
  const queryClient = useQueryClient();
  const [admin, setAdmin] = useState(false);
  useEffect(() => { setAdmin(isAdmin()); }, []);

  const { data, isLoading, refetch } = useQuery<PaginatedResponse<JurisprudenceDocument>>({
    queryKey: ['documents', search, page],
    queryFn: () => apiClient.getDocuments({ search: search || undefined, page, limit: 15 }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteDocument(id),
    onSuccess: () => {
      toast.success('Documento excluído');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      setSelected(null);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const reindexMutation = useMutation({
    mutationFn: (id: string) => apiClient.reindexDocument(id),
    onSuccess: () => {
      toast.success('Reindexação iniciada');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const documents = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jurisprudências</h1>
          <p className="text-slate-500 text-sm mt-1">
            {pagination?.total || 0} documento{(pagination?.total || 0) !== 1 ? 's' : ''} na base
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por título, tribunal, tema ou processo..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-lg
                     placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma jurisprudência encontrada</p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? 'Tente outros termos de busca' : 'Faça o upload do primeiro documento'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Documento
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                  Tribunal
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                  Data
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-medium text-slate-800 leading-tight line-clamp-1">
                        {doc.title}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {doc.fileName} • {formatFileSize(doc.fileSize)}
                        {doc.chunkCount > 0 && ` • ${doc.chunkCount} chunks`}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-slate-600 text-xs">
                      {doc.tribunal || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-slate-600 text-xs">
                      {formatDate(doc.judgmentDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        STATUS_COLORS[doc.processingStatus],
                      )}
                    >
                      {getProcessingStatusLabel(doc.processingStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelected(doc)}
                        className="text-slate-400 hover:text-brand-600 transition-colors p-1 rounded"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {admin && (
                        <>
                          <button
                            onClick={() => reindexMutation.mutate(doc.id)}
                            disabled={reindexMutation.isPending}
                            className="text-slate-400 hover:text-amber-600 transition-colors p-1 rounded"
                            title="Reindexar"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir "${doc.title}"?`)) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-slate-500 text-xs">
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {selected && (
        <DocumentModal doc={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function DocumentModal({
  doc,
  onClose,
}: {
  doc: JurisprudenceDocument;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Detalhes do documento</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Título</p>
            <p className="text-slate-800 font-medium">{doc.title}</p>
          </div>
          {[
            { label: 'Tribunal', value: doc.tribunal },
            { label: 'Número do processo', value: doc.processNumber },
            { label: 'Relator', value: doc.relator },
            { label: 'Data do julgamento', value: formatDate(doc.judgmentDate) },
            { label: 'Tema', value: doc.theme },
            { label: 'Arquivo', value: `${doc.fileName} (${formatFileSize(doc.fileSize)})` },
            { label: 'Chunks indexados', value: doc.chunkCount > 0 ? `${doc.chunkCount} chunks` : '—' },
          ].map(({ label, value }) => value && value !== '—' ? (
            <div key={label}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-slate-800 text-sm">{value}</p>
            </div>
          ) : null)}
          {doc.keywords.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Palavras-chave</p>
              <div className="flex flex-wrap gap-1.5">
                {doc.keywords.map((kw) => (
                  <span key={kw} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          {doc.processingError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium mb-1">Erro no processamento</p>
              <p className="text-xs text-red-500">{doc.processingError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
