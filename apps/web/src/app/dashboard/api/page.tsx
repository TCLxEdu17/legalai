'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Code,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage } from '@/lib/utils';

const keySchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100),
});

type KeyForm = z.infer<typeof keySchema>;

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function ApiPage() {
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<KeyForm>({
    resolver: zodResolver(keySchema),
  });

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient.getApiKeys(),
  });

  const createMutation = useMutation({
    mutationFn: (data: KeyForm) => apiClient.createApiKey(data.name),
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      reset();
      setShowForm(false);
      toast.success('API Key criada! Copie agora — ela não será exibida novamente.');
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteApiKey(id),
    onSuccess: () => {
      toast.success('API Key removida');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Chave copiada!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">API & Chaves de Acesso</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie suas API Keys para integrar com outras aplicações.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Chave
        </button>
      </div>

      {/* Aviso de chave gerada */}
      {newKey && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-300 mb-1">
                Sua nova API Key — salve agora
              </p>
              <p className="text-xs text-amber-400 mb-3">
                Esta chave será exibida apenas uma vez. Copie e armazene com segurança.
              </p>
              <div className="flex items-center gap-2 bg-[#0d0d15] border border-amber-500/20 rounded-lg p-3">
                <code className="flex-1 text-xs font-mono text-slate-300 break-all">{newKey}</code>
                <button
                  onClick={copyKey}
                  className="shrink-0 p-1.5 text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="mt-2 text-xs text-amber-500 hover:text-amber-400 underline"
              >
                Já copiei, fechar aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulário nova chave */}
      {showForm && (
        <div className="bg-[#111118] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-base font-semibold text-slate-100 mb-4">Nova API Key</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="flex gap-3">
            <div className="flex-1">
              <input
                {...register('name')}
                className="w-full px-3 py-2 bg-[#0d0d18] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-600"
                placeholder="Nome da chave (ex: App de Produção)"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-white/5 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); reset(); }}
              className="px-4 py-2 border border-white/10 text-slate-400 hover:bg-white/[0.04] rounded-lg text-sm"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Lista de chaves */}
      <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
          <h2 className="text-sm font-semibold text-slate-400">Chaves ativas</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhuma chave criada ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {apiKeys.map((key: any) => (
              <div key={key.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{key.name}</p>
                    <p className="text-xs text-slate-500">
                      <code className="font-mono">{key.keyPrefix}…</code>
                      {' · '}Criada em {formatDate(key.createdAt)}
                      {key.lastUsedAt && ` · Último uso: ${formatDate(key.lastUsedAt)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(key.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentação básica da API */}
      <div className="bg-[#111118] border border-white/[0.07] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Code className="w-5 h-5 text-brand-400" />
          <h2 className="text-base font-semibold text-slate-100">Como usar a API</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Autenticação por JWT</p>
            <pre className="bg-[#080810] border border-white/5 text-slate-300 text-xs font-mono rounded-lg p-4 overflow-x-auto">
{`# Login e obtenção do token
curl -X POST http://localhost:3001/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@legalai.com.br","password":"Admin@123456"}'

# Usar o accessToken retornado:
curl http://localhost:3001/api/v1/ai/query \\
  -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Qual o entendimento do STJ sobre danos morais?"}'`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Endpoints principais</p>
            <div className="space-y-2">
              {[
                { method: 'POST', path: '/api/v1/auth/login', desc: 'Login e obtenção de tokens' },
                { method: 'POST', path: '/api/v1/auth/refresh', desc: 'Renovar access token' },
                { method: 'POST', path: '/api/v1/chat/message', desc: 'Enviar mensagem ao assistente' },
                { method: 'GET',  path: '/api/v1/chat/sessions', desc: 'Listar sessões de chat' },
                { method: 'GET',  path: '/api/v1/documents', desc: 'Listar jurisprudências indexadas' },
                { method: 'POST', path: '/api/v1/uploads', desc: 'Upload de documento (multipart)' },
                { method: 'GET',  path: '/api/v1/sources', desc: 'Listar fontes automáticas' },
                { method: 'POST', path: '/api/v1/ingestion/sources/:id/run', desc: 'Executar ingestão manual' },
                { method: 'GET',  path: '/api/v1/ingestion/jobs', desc: 'Histórico de ingestões' },
                { method: 'GET',  path: '/api/v1/health', desc: 'Health check da API' },
                { method: 'GET',  path: '/api/docs', desc: 'Swagger/OpenAPI interativo' },
              ].map((ep) => (
                <div key={ep.path} className="flex items-start gap-3 py-2 border-b border-white/[0.05] last:border-0">
                  <span className={`shrink-0 text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' :
                    ep.method === 'POST' ? 'bg-brand-600/15 text-brand-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>
                    {ep.method}
                  </span>
                  <code className="text-xs font-mono text-slate-300 shrink-0">{ep.path}</code>
                  <span className="text-xs text-slate-500">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Exemplo: consulta jurídica</p>
            <pre className="bg-[#080810] border border-white/5 text-slate-300 text-xs font-mono rounded-lg p-4 overflow-x-auto">
{`POST /api/v1/chat/message
{
  "message": "Existe jurisprudência sobre responsabilidade civil em erro médico?",
  "sessionId": "opcional-para-continuar-conversa"
}

# Resposta:
{
  "sessionId": "uuid",
  "message": {
    "id": "uuid",
    "content": "Resposta estruturada da IA...",
    "sources": [
      {
        "documentId": "uuid",
        "title": "STJ - REsp 123456",
        "tribunal": "STJ",
        "processNumber": "REsp 123456",
        "excerpts": [{ "content": "...", "similarity": 0.91 }]
      }
    ],
    "confidence": "high"
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
