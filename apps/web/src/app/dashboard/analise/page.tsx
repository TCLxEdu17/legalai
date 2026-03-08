'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Loader2,
  FileText,
  AlertTriangle,
  Calendar,
  HelpCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AnalysisResult {
  tipoDocumento: string;
  partes: string[];
  resumo: string;
  pontosChave: Array<{ ponto: string; localizacao: string }>;
  datas: Array<{ data: string; descricao: string; localizacao: string }>;
  pontosAtencao: Array<{ ponto: string; localizacao: string; risco: string }>;
  perguntas: string[];
}

const riskColor = {
  alto: 'text-red-400 bg-red-500/10 border-red-500/30',
  médio: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  baixo: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const riskLabel = { alto: 'Alto', médio: 'Médio', baixo: 'Baixo' };

function Section({
  icon: Icon,
  title,
  children,
  count,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
  count?: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-[#111118] rounded-xl border border-white/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand-400" />
          </div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
          {count !== undefined && (
            <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full font-medium">
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-white/[0.05]">{children}</div>}
    </div>
  );
}

export default function AnalisePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      if (err?.code === 'file-too-large') toast.error('Arquivo muito grande. Máximo 50MB.');
      else if (err?.code === 'file-invalid-type') toast.error('Formato inválido. Use PDF ou DOCX.');
      else toast.error('Arquivo rejeitado.');
    },
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await apiClient.analyzeDocument(file);
      setResult(data);
    } catch (e) {
      toast.error(extractApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Análise de Documento</h1>
        <p className="text-slate-500 text-sm mt-1">
          Envie um PDF ou DOCX e a IA extrai os pontos principais, datas, riscos e sugere perguntas estratégicas.
        </p>
      </div>

      {/* Upload Zone */}
      {!result && (
        <div className="bg-[#111118] rounded-xl border border-white/[0.07] p-6 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-brand-400 bg-brand-600/10'
                : file
                ? 'border-emerald-400/50 bg-emerald-500/5'
                : 'border-white/10 hover:border-brand-500/40 hover:bg-white/[0.03]',
            )}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="font-semibold text-slate-200">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="font-medium text-slate-400">
                  {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
                </p>
                <p className="text-sm text-slate-600">PDF ou DOCX • Máximo 50MB</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Analisar Documento
                </>
              )}
            </button>
            {file && (
              <button
                onClick={reset}
                className="px-4 py-3 rounded-lg border border-white/10 text-slate-400 hover:bg-white/[0.04] transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading && (
            <div className="bg-brand-600/10 border border-brand-500/20 rounded-lg px-4 py-3 text-sm text-brand-400 text-center">
              A IA está lendo e analisando o documento. Isso pode levar até 30 segundos...
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-[#111118] rounded-xl border border-white/[0.07] p-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Tipo de documento</p>
              <h2 className="text-xl font-bold text-slate-100">{result.tipoDocumento || 'Documento jurídico'}</h2>
              {result.partes.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {result.partes.map((p, i) => (
                    <span key={i} className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Novo
            </button>
          </div>

          {/* Resumo */}
          {result.resumo && (
            <div className="bg-[#111118] rounded-xl border border-white/[0.07] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-brand-600/15 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-brand-400" />
                </div>
                <h3 className="font-semibold text-slate-100">Resumo Executivo</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.resumo}</p>
            </div>
          )}

          {/* Pontos-chave */}
          {result.pontosChave.length > 0 && (
            <Section icon={CheckCircle} title="Pontos Principais" count={result.pontosChave.length}>
              <ul className="mt-3 space-y-3">
                {result.pontosChave.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-600/15 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-slate-200 text-sm">{item.ponto}</p>
                      {item.localizacao && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.localizacao}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Datas */}
          {result.datas.length > 0 && (
            <Section icon={Calendar} title="Datas e Prazos" count={result.datas.length}>
              <div className="mt-3 space-y-2">
                {result.datas.map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-[#0d0d15] rounded-lg border border-white/[0.05]">
                    <div className="text-center shrink-0">
                      <span className="text-sm font-bold text-brand-400 whitespace-nowrap">{item.data}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm">{item.descricao}</p>
                      {item.localizacao && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.localizacao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Pontos de Atenção */}
          {result.pontosAtencao.length > 0 && (
            <Section icon={AlertTriangle} title="Pontos de Atenção" count={result.pontosAtencao.length}>
              <div className="mt-3 space-y-2">
                {result.pontosAtencao.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-3 rounded-lg border flex gap-3',
                      riskColor[item.risco as keyof typeof riskColor] || riskColor['médio'],
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{item.ponto}</p>
                        <span className="text-xs font-semibold uppercase shrink-0 opacity-75">
                          {riskLabel[item.risco as keyof typeof riskLabel] || item.risco}
                        </span>
                      </div>
                      {item.localizacao && (
                        <p className="text-xs opacity-70 mt-0.5">{item.localizacao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Perguntas */}
          {result.perguntas.length > 0 && (
            <Section icon={HelpCircle} title="Perguntas Estratégicas" count={result.perguntas.length}>
              <ul className="mt-3 space-y-2">
                {result.perguntas.map((q, i) => (
                  <li key={i} className="flex gap-3 p-3 bg-[#0d0d15] rounded-lg border border-white/[0.05]">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-slate-200 text-sm">{q}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
