'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileText, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';

const uploadSchema = z.object({
  title: z.string().min(3, 'Título obrigatório (mín. 3 caracteres)'),
  tribunal: z.string().optional(),
  processNumber: z.string().optional(),
  relator: z.string().optional(),
  judgmentDate: z.string().optional(),
  theme: z.string().optional(),
  keywords: z.string().optional(),
  autoExtractMetadata: z.boolean().default(false),
});

type UploadForm = z.infer<typeof uploadSchema>;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { autoExtractMetadata: true },
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => apiClient.uploadDocument(formData),
    onSuccess: (data) => {
      setUploadResult(data);
      toast.success('Upload iniciado! O documento está sendo processado.');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      reset();
      setFile(null);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const onSubmit = (data: UploadForm) => {
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', data.title);
    if (data.tribunal) formData.append('tribunal', data.tribunal);
    if (data.processNumber) formData.append('processNumber', data.processNumber);
    if (data.relator) formData.append('relator', data.relator);
    if (data.judgmentDate) formData.append('judgmentDate', data.judgmentDate);
    if (data.theme) formData.append('theme', data.theme);
    if (data.keywords) formData.append('keywords', data.keywords);
    formData.append('autoExtractMetadata', String(data.autoExtractMetadata));

    uploadMutation.mutate(formData);
  };

  const fileExt = file?.name.split('.').pop()?.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Upload de jurisprudência</h1>
        <p className="text-slate-500 text-sm mt-1">
          Faça upload de documentos em PDF, DOCX ou TXT para indexação na base.
        </p>
      </div>

      {uploadResult && (
        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-300 font-medium text-sm">Upload realizado com sucesso</p>
            <p className="text-emerald-400 text-xs mt-1">{uploadResult.message}</p>
            <p className="text-emerald-500 text-xs mt-0.5">ID: {uploadResult.id}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dropzone */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Arquivo <span className="text-red-400">*</span>
          </label>
          {file ? (
            <div className="flex items-center gap-3 p-4 bg-brand-600/10 border border-brand-500/30 rounded-xl">
              <div className="w-10 h-10 bg-brand-600/15 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium text-sm truncate">{file.name}</p>
                <p className="text-slate-500 text-xs">
                  {fileExt} • {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-brand-400 bg-brand-600/10'
                  : 'border-white/10 bg-[#0f0f0f] hover:border-brand-500/40 hover:bg-white/[0.03]',
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 font-medium text-sm">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
              </p>
              <p className="text-slate-600 text-xs mt-1">PDF, DOCX ou TXT • Máximo 50 MB</p>
            </div>
          )}
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            {...register('title')}
            placeholder="Ex: REsp 1234567/SP — Responsabilidade Civil"
            className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                       placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          {errors.title && (
            <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Metadados em grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'tribunal', label: 'Tribunal', placeholder: 'Ex: STJ, STF, TJ-SP' },
            { name: 'processNumber', label: 'Número do processo', placeholder: 'Ex: 1234567-89.2023.8.26.0100' },
            { name: 'relator', label: 'Relator', placeholder: 'Nome do ministro/desembargador' },
            { name: 'judgmentDate', label: 'Data do julgamento', type: 'date' },
          ].map(({ name, label, placeholder, type }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
              <input
                {...register(name as any)}
                type={type || 'text'}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                           placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Tema</label>
          <input
            {...register('theme')}
            placeholder="Ex: Responsabilidade civil, contratos, tributário..."
            className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                       placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            Palavras-chave <span className="text-slate-600 font-normal">(separadas por vírgula)</span>
          </label>
          <input
            {...register('keywords')}
            placeholder="dano moral, CDC, relação de consumo"
            className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                       placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Auto-extração */}
        <div className="flex items-start gap-3 p-4 bg-brand-600/10 border border-brand-500/20 rounded-xl">
          <input
            {...register('autoExtractMetadata')}
            type="checkbox"
            id="autoExtract"
            className="mt-0.5 w-4 h-4 text-brand-600 rounded"
          />
          <div>
            <label htmlFor="autoExtract" className="text-sm font-medium text-slate-200 cursor-pointer">
              Extrair metadados automaticamente com IA
            </label>
            <p className="text-slate-500 text-xs mt-0.5">
              A IA tentará identificar tribunal, processo, relator e tema a partir do conteúdo.
              Complementa os campos preenchidos manualmente.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={uploadMutation.isPending || !file}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-white/5 disabled:cursor-not-allowed
                     text-white disabled:text-slate-500 rounded-lg font-medium text-sm transition-colors
                     flex items-center justify-center gap-2"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando e processando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Fazer upload e indexar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
