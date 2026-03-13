'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';

const FASES = {
  consultoria: { label: 'Consultoria / Parecer', minPct: 1, maxPct: 5, minFixed: 500, maxFixed: null },
  extrajudicial: { label: 'Extrajudicial', minPct: 2, maxPct: 10, minFixed: 1000, maxFixed: null },
  primeira: { label: '1ª Instância', minPct: 10, maxPct: 20, minFixed: 2500, maxFixed: null },
  segunda: { label: '2ª Instância (Recurso)', minPct: 5, maxPct: 15, minFixed: 2000, maxFixed: null },
  superior: { label: 'Tribunal Superior (STJ/STF)', minPct: 5, maxPct: 20, minFixed: 3000, maxFixed: null },
  trabalhista: { label: 'Trabalhista', minPct: 15, maxPct: 25, minFixed: 1500, maxFixed: null },
  criminal: { label: 'Criminal', minPct: null, maxPct: null, minFixed: 1500, maxFixed: 15000 },
} as const;

type FaseKey = keyof typeof FASES;
type Complexidade = 'simples' | 'medio' | 'complexo';

const COMPLEXIDADE_MULT: Record<Complexidade, number> = {
  simples: 1,
  medio: 1.3,
  complexo: 1.6,
};

const COMPLEXIDADE_LABELS: Record<Complexidade, string> = {
  simples: 'Simples',
  medio: 'Médio',
  complexo: 'Complexo',
};

interface CalcResult {
  min: number;
  max: number;
  minPct: number | null;
  maxPct: number | null;
}

function calculate(fase: FaseKey, valorCausa: number, complexidade: Complexidade): CalcResult {
  const f = FASES[fase];
  const mult = COMPLEXIDADE_MULT[complexidade];

  if (f.minPct !== null && f.maxPct !== null) {
    const minVal = Math.max(f.minFixed, (valorCausa * f.minPct) / 100) * mult;
    const maxVal = Math.max(f.minFixed, (valorCausa * f.maxPct) / 100) * mult;
    return { min: minVal, max: maxVal, minPct: f.minPct, maxPct: f.maxPct };
  } else {
    const maxFixed = (f as { minFixed: number; maxFixed: number }).maxFixed;
    return { min: f.minFixed * mult, max: maxFixed * mult, minPct: null, maxPct: null };
  }
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const parseCurrencyInput = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

const displayCurrencyInput = (cents: number): string => {
  if (cents === 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents);
};

export default function CalculadoraPage() {
  const [fase, setFase] = useState<FaseKey>('primeira');
  const [valorRaw, setValorRaw] = useState<number>(0);
  const [complexidade, setComplexidade] = useState<Complexidade>('simples');
  const [result, setResult] = useState<CalcResult | null>(null);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseCurrencyInput(e.target.value);
    setValorRaw(parsed);
  };

  const handleCalcular = () => {
    const res = calculate(fase, valorRaw, complexidade);
    setResult(res);
  };

  const handleReset = () => {
    setFase('primeira');
    setValorRaw(0);
    setComplexidade('simples');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <Calculator className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Calculadora de Honorários</h1>
          <p className="text-sm text-slate-500">Baseada na Tabela OAB de Honorários Mínimos</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form card */}
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-6 space-y-5">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Dados da causa</h2>

          {/* Fase processual */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Fase processual
            </label>
            <select
              value={fase}
              onChange={(e) => { setFase(e.target.value as FaseKey); setResult(null); }}
              className="w-full bg-[#1a1a1a] border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors"
            >
              {(Object.keys(FASES) as FaseKey[]).map((key) => (
                <option key={key} value={key} className="bg-[#1a1a1a]">
                  {FASES[key].label}
                </option>
              ))}
            </select>
          </div>

          {/* Valor da causa */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Valor da causa
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-sm text-slate-500 pointer-events-none select-none">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={displayCurrencyInput(valorRaw)}
                onChange={handleValorChange}
                placeholder="0,00"
                className="w-full bg-[#1a1a1a] border border-white/[0.07] rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors"
              />
            </div>
            {fase === 'criminal' && (
              <p className="text-xs text-slate-500">
                Para causas criminais, o valor da causa não é utilizado — aplicamos a tabela de honorários fixos.
              </p>
            )}
          </div>

          {/* Complexidade */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Complexidade
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(COMPLEXIDADE_MULT) as Complexidade[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setComplexidade(key); setResult(null); }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    complexidade === key
                      ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                      : 'bg-[#1a1a1a] border-white/[0.07] text-slate-400 hover:border-white/[0.15] hover:text-slate-300'
                  }`}
                >
                  {COMPLEXIDADE_LABELS[key]}
                  <span className="block text-xs font-normal opacity-60 mt-0.5">
                    {key === 'simples' ? '×1,0' : key === 'medio' ? '×1,3' : '×1,6'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Calcular button */}
          <button
            type="button"
            onClick={handleCalcular}
            disabled={fase !== 'criminal' && valorRaw === 0}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calcular honorários
          </button>
        </div>

        {/* Result card */}
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-6 flex flex-col">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-5">
            Resultado
          </h2>

          {result === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">Preencha os dados ao lado</p>
              <p className="text-xs text-slate-600 mt-1">e clique em "Calcular honorários"</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0a0a] rounded-lg border border-white/[0.07] p-4 space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Mínimo sugerido</p>
                  <p className="text-xl font-bold text-emerald-400 leading-tight">
                    {formatBRL(result.min)}
                  </p>
                  {result.minPct !== null && (
                    <p className="text-xs text-slate-600">{result.minPct}% do valor da causa</p>
                  )}
                </div>
                <div className="bg-[#0a0a0a] rounded-lg border border-white/[0.07] p-4 space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Máximo sugerido</p>
                  <p className="text-xl font-bold text-indigo-400 leading-tight">
                    {formatBRL(result.max)}
                  </p>
                  {result.maxPct !== null && (
                    <p className="text-xs text-slate-600">{result.maxPct}% do valor da causa</p>
                  )}
                </div>
              </div>

              {/* Percentage range */}
              {result.minPct !== null && result.maxPct !== null && (
                <div className="bg-[#0a0a0a] rounded-lg border border-white/[0.07] px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Faixa percentual OAB</span>
                  <span className="text-sm font-semibold text-slate-300">
                    {result.minPct}% – {result.maxPct}%
                  </span>
                </div>
              )}

              {/* Complexidade applied */}
              <div className="bg-[#0a0a0a] rounded-lg border border-white/[0.07] px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Multiplicador de complexidade</span>
                <span className="text-sm font-semibold text-slate-300">
                  ×{COMPLEXIDADE_MULT[complexidade].toFixed(1)} ({COMPLEXIDADE_LABELS[complexidade]})
                </span>
              </div>

              {/* Disclaimer */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  Baseado na Tabela OAB. Valores orientativos — consulte a seccional da OAB do seu estado.
                </p>
              </div>

              {/* Reset button */}
              <button
                type="button"
                onClick={handleReset}
                className="mt-auto w-full py-2 px-4 rounded-lg border border-white/[0.07] text-slate-400 hover:text-slate-200 hover:border-white/[0.15] text-sm transition-colors"
              >
                Calcular novamente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Honorários Convencionados</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ajustados livremente entre advogado e cliente por contrato escrito, respeitando os mínimos da tabela OAB estadual.
          </p>
        </div>
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Honorários Sucumbenciais</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Fixados pelo juiz e pagos pela parte vencida. Pertencem ao advogado e não se confundem com os honorários contratuais.
          </p>
        </div>
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Tabela OAB</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cada seccional estadual publica sua tabela de honorários mínimos. Os valores desta calculadora seguem as diretrizes gerais do CFOAB.
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-white/[0.07] bg-[#141414] px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          ⚖️ Esta calculadora é uma ferramenta de apoio. Os valores são baseados nas tabelas orientativas da OAB e podem variar conforme a seccional estadual, complexidade real do caso e acordo entre as partes.
        </p>
      </div>
    </div>
  );
}
