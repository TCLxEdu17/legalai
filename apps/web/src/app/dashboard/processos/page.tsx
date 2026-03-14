'use client';

import { useState } from 'react';
import { Gavel, Search, Loader2, AlertCircle, User, Building2, Clock, Scale, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api-client';


const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;

interface Party {
  name: string;
  type: string;
  lawyers: string[];
}

interface Movement {
  date: string;
  code: number;
  name: string;
  complemento?: string;
}

interface ProcessoResult {
  number: string;
  tribunal: string;
  classe: string;
  assuntos: string[];
  dataAjuizamento: string | null;
  orgaoJulgador: string | null;
  grau: string;
  status: string;
  parties: Party[];
  movements: Movement[];
  source: 'datajud';
}

const PARTY_COLORS: Record<string, string> = {
  'Autor': 'bg-brand-600/10 text-brand-400 border-brand-500/20',
  'Réu': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Advogado': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Advogado do Autor': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Advogado do Réu': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Requerente': 'bg-brand-600/10 text-brand-400 border-brand-500/20',
  'Requerido': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Reclamante': 'bg-brand-600/10 text-brand-400 border-brand-500/20',
  'Reclamado': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Terceiro': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

function partyColor(type: string) {
  return PARTY_COLORS[type] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatDateTime(d: string) {
  try {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function formatInput(v: string) {
  const digits = v.replace(/\D/g, '');
  let out = digits;
  if (digits.length > 7) out = digits.slice(0, 7) + '-' + digits.slice(7);
  if (digits.length > 9) out = out.slice(0, 10) + '.' + out.slice(10);
  if (digits.length > 13) out = out.slice(0, 15) + '.' + out.slice(15);
  if (digits.length > 14) out = out.slice(0, 17) + '.' + out.slice(17);
  if (digits.length > 16) out = out.slice(0, 20) + '.' + out.slice(20);
  return out.slice(0, 25);
}

export default function ProcessosPage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processo, setProcesso] = useState<ProcessoResult | null>(null);

  const handleSearch = async () => {
    if (!CNJ_REGEX.test(input)) {
      setError('Formato inválido. Use: NNNNNNN-DD.AAAA.J.TT.OOOO');
      return;
    }
    setError('');
    setLoading(true);
    setProcesso(null);

    try {
      const data = await apiClient.getProcesso(input) as ProcessoResult;
      setProcesso(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao consultar processo';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const grauLabel: Record<string, string> = {
    G1: '1º Grau', G2: '2º Grau', GR: 'Recursal', SU: 'Superior', JE: 'Juizado Especial',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Gavel className="w-6 h-6 text-brand-400" />
          Consulta Processual
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Dados oficiais via{' '}
          <span className="text-brand-400 font-medium">DataJud — CNJ</span>
          {' '}· Todos os tribunais brasileiros
        </p>
      </div>

      {/* Search */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-3">
        <label className="text-xs text-slate-500 block">Número do processo (formato CNJ)</label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(formatInput(e.target.value)); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="0000001-00.2025.8.26.0100"
              className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg font-mono
                         placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {error && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error}
              </p>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>
        <p className="text-xs text-slate-600">
          Ex.: TJSP → J=8, TT=26 · TJRJ → J=8, TT=19 · TRF1 → J=5, TT=01 · TRT2 → J=4, TT=02
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span className="text-sm">Consultando DataJud...</span>
        </div>
      )}

      {/* Result */}
      {processo && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Número do processo</p>
                <p className="text-slate-100 font-mono font-semibold text-lg">{processo.number}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {processo.grau && (
                  <span className="text-xs px-2.5 py-1 bg-slate-500/15 text-slate-400 rounded-full font-medium">
                    {grauLabel[processo.grau] ?? processo.grau}
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-full font-medium flex items-center gap-1">
                  <Scale className="w-3 h-3" />
                  DataJud
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />Tribunal
                </p>
                <p className="text-slate-300 text-sm font-medium">{processo.tribunal}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Classe</p>
                <p className="text-slate-300 text-sm">{processo.classe || '—'}</p>
              </div>
              {processo.orgaoJulgador && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Órgão Julgador</p>
                  <p className="text-slate-300 text-sm">{processo.orgaoJulgador}</p>
                </div>
              )}
              {processo.dataAjuizamento && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Data de Ajuizamento</p>
                  <p className="text-slate-300 text-sm">{formatDate(processo.dataAjuizamento)}</p>
                </div>
              )}
            </div>

            {processo.assuntos.length > 0 && (
              <div className="pt-3 border-t border-white/[0.05]">
                <p className="text-xs text-slate-500 mb-2">Assuntos</p>
                <div className="flex flex-wrap gap-1.5">
                  {processo.assuntos.map((a, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-brand-600/10 text-brand-400 rounded-full border border-brand-500/20">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Parties */}
          {processo.parties.length > 0 && (
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  Partes ({processo.parties.length})
                </p>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {processo.parties.map((p, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${partyColor(p.type)}`}>
                        {p.type}
                      </span>
                      <div>
                        <p className="text-slate-300 text-sm">{p.name}</p>
                        {p.lawyers.length > 0 && (
                          <p className="text-slate-600 text-xs mt-0.5">
                            Adv.: {p.lawyers.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movements timeline */}
          {processo.movements.length > 0 && (
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Movimentações ({processo.movements.length})
                </p>
              </div>
              <div className="p-4 space-y-0">
                {processo.movements.map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${i === 0 ? 'bg-brand-500' : 'bg-slate-700'}`} />
                      {i < processo.movements.length - 1 && (
                        <div className="w-px flex-1 bg-white/[0.06] mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs text-slate-500">{formatDateTime(m.date)}</p>
                      <p className="text-slate-300 text-sm">{m.name}</p>
                      {m.complemento && (
                        <p className="text-slate-500 text-xs mt-0.5">{m.complemento}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source badge */}
          <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
            <ExternalLink className="w-3 h-3" />
            Dados obtidos via DataJud · Conselho Nacional de Justiça
          </div>
        </div>
      )}
    </div>
  );
}
