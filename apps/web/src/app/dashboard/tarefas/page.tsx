'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  case?: { id: string; title: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const prioridadeColors: Record<string, string> = {
  BAIXA: 'text-slate-400 bg-slate-400/10',
  MEDIA: 'text-blue-400 bg-blue-400/10',
  ALTA: 'text-amber-400 bg-amber-400/10',
  URGENTE: 'text-red-400 bg-red-400/10',
};

const statusCols: Array<{ key: Tarefa['status']; label: string; color: string }> = [
  { key: 'PENDENTE', label: 'Pendente', color: 'border-amber-500/30' },
  { key: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'border-blue-500/30' },
  { key: 'CONCLUIDA', label: 'Concluída', color: 'border-emerald-500/30' },
];

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', prazo: '', prioridade: 'MEDIA', caseId: '' });

  useEffect(() => {
    loadTarefas();
  }, []);

  async function loadTarefas() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tarefas?limit=100`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTarefas(data.items || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function criarTarefa() {
    if (!form.titulo) { toast.error('Título é obrigatório'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/tarefas`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || undefined,
          prazo: form.prazo || undefined,
          prioridade: form.prioridade,
          caseId: form.caseId || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Tarefa criada');
        setShowModal(false);
        setForm({ titulo: '', descricao: '', prazo: '', prioridade: 'MEDIA', caseId: '' });
        loadTarefas();
      } else {
        toast.error('Erro ao criar tarefa');
      }
    } catch {
      toast.error('Erro ao criar tarefa');
    }
  }

  async function atualizarStatus(id: string, status: Tarefa['status']) {
    try {
      const res = await fetch(`${API_URL}/api/v1/tarefas/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTarefas((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
      }
    } catch { /* ignore */ }
  }

  function isVencida(t: Tarefa) {
    return t.prazo && new Date(t.prazo) < new Date() && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA';
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Diligências e Tarefas</h1>
            <p className="text-slate-500 text-sm mt-1">Organize as tarefas e diligências dos seus casos</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nova Tarefa
          </button>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusCols.map((col) => {
            const colTarefas = tarefas.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className={`bg-[#141414] border ${col.color} rounded-xl p-4 space-y-3`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">{col.label}</h3>
                  <span className="text-xs text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full">{colTarefas.length}</span>
                </div>
                {loading && <div className="text-slate-600 text-xs text-center py-4">Carregando...</div>}
                {!loading && colTarefas.length === 0 && (
                  <div className="text-slate-700 text-xs text-center py-4">Nenhuma tarefa</div>
                )}
                {colTarefas.map((t) => (
                  <div key={t.id} className={`bg-[#0a0a0a] border ${isVencida(t) ? 'border-red-500/30' : 'border-white/[0.06]'} rounded-lg p-3 space-y-2`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${prioridadeColors[t.prioridade]}`}>
                        {t.prioridade}
                      </span>
                      {isVencida(t) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium shrink-0">
                          ATRASADA
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 font-medium">{t.titulo}</p>
                    {t.descricao && <p className="text-xs text-slate-500">{t.descricao}</p>}
                    {t.prazo && (
                      <p className="text-xs text-slate-600">
                        Prazo: {new Date(t.prazo).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {t.case && <p className="text-xs text-brand-400/70">{t.case.title}</p>}
                    <div className="flex gap-1.5 pt-1">
                      {col.key === 'PENDENTE' && (
                        <button onClick={() => atualizarStatus(t.id, 'EM_ANDAMENTO')} className="text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors">
                          Iniciar
                        </button>
                      )}
                      {col.key === 'EM_ANDAMENTO' && (
                        <button onClick={() => atualizarStatus(t.id, 'CONCLUIDA')} className="text-[10px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors">
                          Concluir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#141414] border border-white/[0.08] rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Nova Tarefa</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Título *</label>
              <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" placeholder="Ex: Protocolar recurso..." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none resize-none" placeholder="Detalhes..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Prazo</label>
                <input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Prioridade</label>
                <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100">
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-white/[0.08] text-slate-400 hover:text-slate-200 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
              <button onClick={criarTarefa} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg text-sm transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
