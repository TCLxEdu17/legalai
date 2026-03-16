'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface PredictionResult {
  probabilidade: number;
  prazoMedio: number;
  fundamento?: string;
  pontosFavoraveis?: string[];
  pontosContrarios?: string[];
  jurisprudenciasRelevantes?: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function ProbabilityGauge({ value }: { value: number }) {
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 54;
  const progress = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="28" fontWeight="bold">
          {value}%
        </text>
        <text x="70" y="92" textAnchor="middle" fill="#64748b" fontSize="11">
          probabilidade
        </text>
      </svg>
    </div>
  );
}

export default function PredicaoPage() {
  const [form, setForm] = useState({ area: '', tribunal: '', pedido: '', resumoFatos: '' });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<PredictionResult | null>(null);

  async function analisar() {
    if (!form.area || !form.tribunal || !form.pedido) {
      toast.error('Preencha área, tribunal e pedido principal');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/analytics/predicao`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setResultado(data);
      } else {
        toast.error('Erro ao gerar análise preditiva');
      }
    } catch {
      toast.error('Erro ao gerar análise preditiva');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Análise Preditiva de Desfecho</h1>
          <p className="text-slate-500 text-sm mt-1">
            Estimativa de resultado baseada em jurisprudência e IA
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Área do Direito *</label>
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                <option value="">Selecione...</option>
                <option value="trabalhista">Trabalhista</option>
                <option value="cível">Cível</option>
                <option value="penal">Penal</option>
                <option value="previdenciário">Previdenciário</option>
                <option value="tributário">Tributário</option>
                <option value="consumidor">Consumidor</option>
                <option value="família">Família</option>
                <option value="empresarial">Empresarial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Tribunal *</label>
              <select value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                <option value="">Selecione...</option>
                <option value="TJSP">TJSP</option>
                <option value="TJRJ">TJRJ</option>
                <option value="TJMG">TJMG</option>
                <option value="TST">TST</option>
                <option value="TRT">TRT</option>
                <option value="STJ">STJ</option>
                <option value="STF">STF</option>
                <option value="TRF">TRF</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Pedido Principal *</label>
              <input value={form.pedido} onChange={(e) => setForm({ ...form, pedido: e.target.value })} placeholder="Ex: Horas extras, indenização por dano moral..." className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Resumo dos Fatos</label>
              <textarea value={form.resumoFatos} onChange={(e) => setForm({ ...form, resumoFatos: e.target.value })} rows={4} placeholder="Descreva brevemente os fatos do caso..." className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none resize-none" />
            </div>
            <button onClick={analisar} disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
              {loading ? 'Analisando com IA...' : 'Analisar Desfecho'}
            </button>
          </div>

          {/* Results */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6">
            {!resultado ? (
              <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                Preencha o formulário e clique em Analisar
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-center">
                  <ProbabilityGauge value={resultado.probabilidade} />
                </div>

                <div className="flex gap-4 justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-400">{resultado.prazoMedio}</p>
                    <p className="text-xs text-slate-500">meses estimados</p>
                  </div>
                </div>

                {resultado.fundamento && (
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Fundamento</p>
                    <p className="text-sm text-slate-300">{resultado.fundamento}</p>
                  </div>
                )}

                {resultado.pontosFavoraveis && resultado.pontosFavoraveis.length > 0 && (
                  <div>
                    <p className="text-xs text-emerald-400 font-medium mb-2">Pontos Favoráveis</p>
                    <ul className="space-y-1">
                      {resultado.pontosFavoraveis.map((p, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-2"><span className="text-emerald-500 shrink-0">+</span>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {resultado.pontosContrarios && resultado.pontosContrarios.length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 font-medium mb-2">Pontos Contrários</p>
                    <ul className="space-y-1">
                      {resultado.pontosContrarios.map((p, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-2"><span className="text-red-500 shrink-0">−</span>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {resultado.jurisprudenciasRelevantes && resultado.jurisprudenciasRelevantes.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">Jurisprudências que embasaram</p>
                    <ul className="space-y-1">
                      {resultado.jurisprudenciasRelevantes.map((j, i) => (
                        <li key={i} className="text-xs text-slate-500 bg-white/[0.03] rounded p-2">{j}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
