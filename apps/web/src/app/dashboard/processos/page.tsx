'use client';

import { useState } from 'react';
import { Gavel, Search, Loader2, AlertCircle, User, Building2, Clock } from 'lucide-react';

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;

interface MockProcess {
  number: string;
  court: string;
  subject: string;
  status: string;
  parties: Array<{ name: string; type: 'Autor' | 'Réu' | 'Advogado' }>;
  movements: Array<{ date: string; description: string }>;
}

function generateMock(number: string): MockProcess {
  return {
    number,
    court: '2ª Vara Cível da Comarca de São Paulo',
    subject: 'Responsabilidade Civil / Indenização por Dano Material e Moral',
    status: 'Em andamento — aguardando julgamento',
    parties: [
      { name: 'João da Silva Santos', type: 'Autor' },
      { name: 'Empresa XYZ Ltda.', type: 'Réu' },
      { name: 'Dra. Maria Oliveira — OAB/SP 123.456', type: 'Advogado' },
      { name: 'Dr. Carlos Ferreira — OAB/SP 789.012', type: 'Advogado' },
    ],
    movements: [
      { date: '2026-03-10', description: 'Conclusão para sentença' },
      { date: '2026-02-28', description: 'Juntada de memoriais pelas partes' },
      { date: '2026-02-15', description: 'Audiência de instrução e julgamento realizada' },
      { date: '2026-01-20', description: 'Decisão: deferida produção de prova testemunhal' },
      { date: '2025-12-05', description: 'Contestação apresentada pelo réu' },
      { date: '2025-11-10', description: 'Despacho: citação do réu efetivada' },
      { date: '2025-10-15', description: 'Petição inicial distribuída — processo autuado' },
    ],
  };
}

const PARTY_COLORS: Record<string, string> = {
  'Autor': 'bg-brand-600/10 text-brand-400',
  'Réu': 'bg-red-500/10 text-red-400',
  'Advogado': 'bg-emerald-500/10 text-emerald-400',
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProcessosPage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [process, setProcess] = useState<MockProcess | null>(null);

  const formatInput = (v: string) => {
    // Auto-format CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
    const digits = v.replace(/\D/g, '');
    let out = digits;
    if (digits.length > 7) out = digits.slice(0, 7) + '-' + digits.slice(7);
    if (digits.length > 9) out = out.slice(0, 10) + '.' + out.slice(10);
    if (digits.length > 13) out = out.slice(0, 15) + '.' + out.slice(15);
    if (digits.length > 14) out = out.slice(0, 17) + '.' + out.slice(17);
    if (digits.length > 16) out = out.slice(0, 20) + '.' + out.slice(20);
    return out.slice(0, 25);
  };

  const handleSearch = () => {
    if (!CNJ_REGEX.test(input)) {
      setError('Formato inválido. Use: NNNNNNN-DD.AAAA.J.TT.OOOO');
      return;
    }
    setError('');
    setLoading(true);
    setProcess(null);
    setTimeout(() => {
      setProcess(generateMock(input));
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Gavel className="w-6 h-6 text-brand-400" />
          Consulta Processual
        </h1>
        <p className="text-slate-500 text-sm mt-1">Busque informações sobre processos pelo número CNJ</p>
      </div>

      {/* Mock notice */}
      <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-300 text-xs">
          Integração com PJe/CNJ em desenvolvimento — dados simulados para fins de demonstração.
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
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
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
      </div>

      {/* Result */}
      {process && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Número do processo</p>
                <p className="text-slate-100 font-mono font-semibold">{process.number}</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-amber-500/15 text-amber-400 rounded-full font-medium shrink-0">
                Em andamento
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/[0.05]">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" />Tribunal</p>
                <p className="text-slate-300 text-sm">{process.court}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500 mb-1">Assunto</p>
                <p className="text-slate-300 text-sm">{process.subject}</p>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
              <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Partes
              </p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/[0.05]">
                {process.parties.map((p, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PARTY_COLORS[p.type] || 'bg-white/5 text-slate-400'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Movements timeline */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
              <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Movimentações
              </p>
            </div>
            <div className="p-4 space-y-3">
              {process.movements.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${i === 0 ? 'bg-brand-500' : 'bg-slate-600'}`} />
                    {i < process.movements.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-xs text-slate-500">{formatDate(m.date)}</p>
                    <p className="text-slate-300 text-sm">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
