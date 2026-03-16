'use client';

import { useRef, useState } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { useQuery, useMutation } from '@tanstack/react-query';
import { GitCompare, Search, X, Sparkles, FileText, Upload, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';

interface DocResult {
  id: string;
  title: string;
  tribunal?: string;
  theme?: string;
  uploaded?: boolean; // doc anexado nesta sessão
}

export default function ComparadorPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DocResult[]>([]);
  const [perspective, setPerspective] = useState<'réu' | 'autor'>('réu');
  const [comparison, setComparison] = useState<string | null>(null);
  const [comparedDocs, setComparedDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading: searching } = useQuery({
    queryKey: ['documents-search', search],
    queryFn: () => apiClient.getDocuments({ search: search || undefined, limit: 10 }),
    enabled: search.length > 2,
  });

  const compareMutation = useMutation({
    mutationFn: () => apiClient.compareDocuments(selected.map((d) => d.id), perspective),
    onSuccess: (data) => {
      setComparison(data.comparison);
      setComparedDocs(data.documents);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const documents: DocResult[] = data?.data || [];

  const addDoc = (doc: DocResult) => {
    if (selected.length >= 4) { toast.error('Máximo de 4 documentos'); return; }
    if (selected.some((d) => d.id === doc.id)) { toast.error('Documento já selecionado'); return; }
    setSelected((prev) => [...prev, doc]);
    setSearch('');
    setComparison(null);
  };

  const removeDoc = (id: string) => {
    setSelected((prev) => prev.filter((d) => d.id !== id));
    setComparison(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selected.length >= 4) { toast.error('Máximo de 4 documentos'); return; }

    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido. Use PDF, DOCX ou TXT');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const doc = await apiClient.uploadDocument(formData);
      addDoc({ id: doc.id, title: doc.title || file.name, uploaded: true });
      toast.success(`"${file.name}" adicionado para comparação`);
    } catch (err: any) {
      toast.error(extractApiErrorMessage(err) || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-brand-400" />
          Comparador de Decisões
        </h1>
        <p className="text-slate-500 text-sm mt-1">Selecione 2 a 4 jurisprudências para comparar com IA — da base ou por upload</p>
      </div>

      {/* Search & selection */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">

        {/* Input row: search + upload button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jurisprudências por título, tribunal ou tema..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                         placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searching && <PlanetLoader size="xs" />}
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || selected.length >= 4}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111111] border border-white/10 hover:border-brand-500/40 hover:bg-brand-600/5
                       text-slate-400 hover:text-brand-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Anexar PDF, DOCX ou TXT"
          >
            {uploading ? (
              <PlanetLoader size="xs" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
            {uploading ? 'Enviando...' : 'Anexar'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        <p className="text-xs text-slate-600 flex items-center gap-1.5">
          <Upload className="w-3 h-3" />
          Aceita arquivos da base de jurisprudências ou upload direto de PDF, DOCX ou TXT
        </p>

        {/* Search results dropdown */}
        {search.length > 2 && documents.length > 0 && (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => addDoc(doc)}
                disabled={selected.some((d) => d.id === doc.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 border-b border-white/[0.05] last:border-0"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-medium truncate">{doc.title}</p>
                  {doc.tribunal && <p className="text-slate-500 text-[11px]">{doc.tribunal}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected documents */}
        {selected.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">{selected.length}/4 documentos selecionados</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selected.map((doc, i) => (
                <div key={doc.id} className={cn(
                  'flex items-start gap-2 p-2.5 border rounded-lg',
                  doc.uploaded
                    ? 'bg-emerald-600/5 border-emerald-500/20'
                    : 'bg-brand-600/5 border-brand-500/20'
                )}>
                  <span className={cn(
                    'text-[10px] rounded px-1.5 py-0.5 shrink-0 font-bold',
                    doc.uploaded ? 'bg-emerald-600/20 text-emerald-400' : 'bg-brand-600/20 text-brand-400'
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium truncate">{doc.title}</p>
                    <p className={cn('text-[11px]', doc.uploaded ? 'text-emerald-600' : 'text-slate-500')}>
                      {doc.uploaded ? '📎 Anexado' : doc.tribunal || ''}
                    </p>
                  </div>
                  <button onClick={() => removeDoc(doc.id)} className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Perspective & compare button */}
        {selected.length >= 2 && (
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Perspectiva:</span>
              {(['réu', 'autor'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPerspective(p)}
                  className={cn('text-xs px-3 py-1.5 rounded-lg transition-colors', perspective === p ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20' : 'bg-white/5 text-slate-500 hover:bg-white/10')}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => compareMutation.mutate()}
              disabled={compareMutation.isPending}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {compareMutation.isPending ? <PlanetLoader size="xs" /> : <Sparkles className="w-4 h-4" />}
              Comparar com IA
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {compareMutation.isPending && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl shimmer" />)}
        </div>
      )}

      {/* Comparison result */}
      {comparison && (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05] bg-white/[0.02] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-slate-300">Análise comparativa — perspectiva do {perspective}</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
              {comparedDocs.map((doc, i) => (
                <div key={doc.id} className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                  <p className="text-[10px] text-brand-400 font-bold mb-0.5">Decisão {i + 1}</p>
                  <p className="text-slate-300 text-[11px] line-clamp-2 leading-tight">{doc.title}</p>
                  {doc.tribunal && <p className="text-slate-600 text-[10px] mt-0.5">{doc.tribunal}</p>}
                </div>
              ))}
            </div>
            <div className="prose-legal">
              <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{comparison}</p>
            </div>
          </div>
        </div>
      )}

      {selected.length < 2 && !comparison && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-[#141414] border border-white/[0.07] rounded-xl">
          <GitCompare className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Selecione ao menos 2 documentos</p>
          <p className="text-slate-500 text-sm mt-1">Use a busca ou anexe arquivos PDF, DOCX ou TXT</p>
        </div>
      )}
    </div>
  );
}
