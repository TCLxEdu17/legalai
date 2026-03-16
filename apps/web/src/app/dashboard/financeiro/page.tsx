'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Lancamento {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  descricao: string;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  vencimento?: string;
  createdAt: string;
  categoria?: string;
}

interface Resumo {
  entradas: number;
  saidas: number;
  saldo: number;
  inadimplencia: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function FinanceiroPage() {
  const [tab, setTab] = useState<'resumo' | 'lancamentos' | 'receber'>('resumo');
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tipo: 'ENTRADA', valor: '', descricao: '', vencimento: '', categoria: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [resumoRes, lancRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/financeiro/resumo`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/v1/financeiro/lancamentos`, { headers: authHeaders() }),
      ]);
      if (resumoRes.ok) setResumo(await resumoRes.json());
      if (lancRes.ok) {
        const data = await lancRes.json();
        setLancamentos(data.items || []);
      }
    } catch {
      // silently fail — data may not be available yet
    } finally {
      setLoading(false);
    }
  }

  async function criarLancamento() {
    if (!form.descricao || !form.valor) {
      toast.error('Preencha descrição e valor');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/financeiro/lancamentos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tipo: form.tipo,
          valor: parseFloat(form.valor),
          descricao: form.descricao,
          vencimento: form.vencimento || undefined,
          categoria: form.categoria || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Lançamento criado');
        setShowModal(false);
        setForm({ tipo: 'ENTRADA', valor: '', descricao: '', vencimento: '', categoria: '' });
        loadData();
      } else {
        toast.error('Erro ao criar lançamento');
      }
    } catch {
      toast.error('Erro ao criar lançamento');
    }
  }

  const aReceber = lancamentos.filter((l) => l.tipo === 'ENTRADA' && l.status === 'PENDENTE');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Financeiro</h1>
            <p className="text-slate-500 text-sm mt-1">Controle de receitas, despesas e fluxo de caixa</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Novo Lançamento
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#141414] border border-white/[0.06] rounded-lg p-1 w-fit">
          {(['resumo', 'lancamentos', 'receber'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-brand-600/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t === 'receber' ? 'A Receber' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Resumo Tab */}
        {tab === 'resumo' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Saldo do Mês', value: resumo?.saldo ?? 0, color: 'text-brand-400' },
              { label: 'Total Entradas', value: resumo?.entradas ?? 0, color: 'text-emerald-400' },
              { label: 'Total Saídas', value: resumo?.saidas ?? 0, color: 'text-red-400' },
              { label: 'Inadimplência', value: resumo?.inadimplencia ?? 0, color: 'text-amber-400' },
            ].map((card) => (
              <div key={card.label} className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
                <p className="text-xs text-slate-500 mb-2">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>
                  {loading ? '...' : formatBRL(card.value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Lançamentos Tab */}
        {tab === 'lancamentos' && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
            {lancamentos.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
                {loading ? 'Carregando...' : 'Nenhum lançamento ainda'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-500">
                    <th className="text-left px-4 py-3 font-medium">Descrição</th>
                    <th className="text-left px-4 py-3 font-medium">Tipo</th>
                    <th className="text-right px-4 py-3 font-medium">Valor</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l) => (
                    <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-300">{l.descricao}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${l.tipo === 'ENTRADA' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {l.tipo}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${l.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {l.tipo === 'ENTRADA' ? '+' : '-'}{formatBRL(l.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${l.status === 'PAGO' ? 'text-emerald-400' : l.status === 'VENCIDO' ? 'text-red-400' : 'text-amber-400'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* A Receber Tab */}
        {tab === 'receber' && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
            {aReceber.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
                Nenhum valor a receber pendente
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-500">
                    <th className="text-left px-4 py-3 font-medium">Descrição</th>
                    <th className="text-right px-4 py-3 font-medium">Valor</th>
                    <th className="text-left px-4 py-3 font-medium">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {aReceber.map((l) => (
                    <tr key={l.id} className="border-b border-white/[0.04]">
                      <td className="px-4 py-3 text-slate-300">{l.descricao}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatBRL(l.valor)}</td>
                      <td className="px-4 py-3 text-slate-400">{l.vencimento ? new Date(l.vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#141414] border border-white/[0.08] rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Novo Lançamento</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100">
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Descrição *</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" placeholder="Honorários ref. processo..." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Valor (R$) *</label>
              <input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Vencimento</label>
              <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Categoria</label>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" placeholder="Ex: Honorários, Aluguel..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-white/[0.08] text-slate-400 hover:text-slate-200 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
              <button onClick={criarLancamento} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg text-sm transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
