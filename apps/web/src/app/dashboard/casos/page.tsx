'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Loader2,
  FileText,
  MessageSquare,
  Scale,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';

interface Case {
  id: string;
  title: string;
  area?: string;
  status: string;
  processNumber?: string;
  court?: string;
  plaintiff?: string;
  defendant?: string;
  createdAt: string;
  updatedAt: string;
  _count: { documents: number; messages: number; pieces: number };
}

const AREAS = [
  'Cível', 'Trabalhista', 'Penal', 'Tributário', 'Previdenciário',
  'Consumidor', 'Administrativo', 'Família', 'Empresarial', 'Outro',
];

const emptyForm = {
  title: '',
  area: '',
  processNumber: '',
  court: '',
  plaintiff: '',
  defendant: '',
  notes: '',
};

export default function CasosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases(),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createCase(form),
    onSuccess: (created: Case) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Caso criado com sucesso');
      setShowModal(false);
      setForm(emptyForm);
      router.push(`/dashboard/casos/${created.id}`);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Caso excluído');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const filtered = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.plaintiff?.toLowerCase().includes(search.toLowerCase()) ||
      c.defendant?.toLowerCase().includes(search.toLowerCase()) ||
      c.processNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-400',
    ARCHIVED: 'bg-slate-500/20 text-slate-400',
    CLOSED: 'bg-red-500/20 text-red-400',
  };

  const statusLabel: Record<string, string> = {
    ACTIVE: 'Ativo',
    ARCHIVED: 'Arquivado',
    CLOSED: 'Encerrado',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600/15 border border-brand-500/20 rounded-xl flex items-center justify-center">
            <FolderOpen className="w-4.5 h-4.5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Meus Casos</h1>
            <p className="text-slate-500 text-sm">
              {cases.length} caso{cases.length !== 1 ? 's' : ''} cadastrado{cases.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Caso
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, partes ou número do processo..."
          className="w-full bg-[#141414] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mb-4">
            <Scale className="w-8 h-8 text-slate-700" />
          </div>
          <p className="text-slate-300 font-medium">Nenhum caso encontrado</p>
          <p className="text-slate-600 text-sm mt-1 max-w-xs">
            {search ? 'Tente outros termos de busca.' : 'Crie seu primeiro caso jurídico para começar a usar o copiloto.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/20 text-brand-400 text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro caso
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group bg-[#141414] border border-white/[0.07] rounded-xl p-5 hover:border-white/[0.14] hover:bg-[#161616] transition-all cursor-pointer"
              onClick={() => router.push(`/dashboard/casos/${c.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusColor[c.status])}>
                      {statusLabel[c.status]}
                    </span>
                    {c.area && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                        {c.area}
                      </span>
                    )}
                  </div>
                  <h3 className="text-slate-100 font-semibold text-sm truncate">{c.title}</h3>
                  {(c.plaintiff || c.defendant) && (
                    <p className="text-slate-500 text-xs mt-1 truncate">
                      {[c.plaintiff, c.defendant].filter(Boolean).join(' × ')}
                    </p>
                  )}
                  {c.processNumber && (
                    <p className="text-slate-600 text-xs mt-0.5 font-mono">Proc: {c.processNumber}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1" title="Documentos">
                      <FileText className="w-3.5 h-3.5" />
                      {c._count.documents}
                    </span>
                    <span className="flex items-center gap-1" title="Mensagens">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {c._count.messages}
                    </span>
                    <span className="flex items-center gap-1" title="Peças">
                      <Scale className="w-3.5 h-3.5" />
                      {c._count.pieces}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Excluir o caso "${c.title}"? Esta ação não pode ser desfeita.`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-slate-100 font-semibold">Novo Caso</h2>
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Título do caso *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: João Silva vs. Banco Itaú — Dano Moral"
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Área jurídica</label>
                  <select
                    value={form.area}
                    onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                  >
                    <option value="">Selecionar...</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Nº do processo</label>
                  <input
                    value={form.processNumber}
                    onChange={(e) => setForm((f) => ({ ...f, processNumber: e.target.value }))}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Autor / Requerente</label>
                  <input
                    value={form.plaintiff}
                    onChange={(e) => setForm((f) => ({ ...f, plaintiff: e.target.value }))}
                    placeholder="Nome completo"
                    className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Réu / Requerido</label>
                  <input
                    value={form.defendant}
                    onChange={(e) => setForm((f) => ({ ...f, defendant: e.target.value }))}
                    placeholder="Nome ou razão social"
                    className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Tribunal / Vara</label>
                <input
                  value={form.court}
                  onChange={(e) => setForm((f) => ({ ...f, court: e.target.value }))}
                  placeholder="Ex: 3ª Vara Cível de São Paulo"
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Notas iniciais</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Contexto inicial, observações sobre o cliente ou estratégia..."
                  rows={2}
                  className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/30 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-white/[0.06]">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.title.trim() || createMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Caso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
