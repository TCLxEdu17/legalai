'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Calculator, Info, Copy, Check } from 'lucide-react';
import {
  FASES,
  MULT_LABEL,
  calculate,
  gerarProposta,
  formatBRL,
  parseCurrency,
  displayCurrency,
  type FaseKey,
  type Complexidade,
  type Modelo,
} from './calculadora.utils';

// ─── Componente ────────────────────────────────────────────────────────────

export default function CalculadoraPage() {
  const [fase, setFase] = useState<FaseKey>('primeira');
  const [valorRaw, setValorRaw] = useState(0);
  const [complexidade, setComplexidade] = useState<Complexidade>('simples');
  const [modelo, setModelo] = useState<Modelo>('fixo');
  const [exitoPct, setExitoPct] = useState(20);
  const [copied, setCopied] = useState(false);

  // Resultado confirmado (só atualiza ao clicar em Calcular)
  const [calcFase, setCalcFase] = useState<FaseKey>('primeira');
  const [calcValor, setCalcValor] = useState(0);
  const [calcComplexidade, setCalcComplexidade] = useState<Complexidade>('simples');
  const [calcModelo, setCalcModelo] = useState<Modelo>('fixo');
  const [calcExitoPct, setCalcExitoPct] = useState(20);
  const [hasResult, setHasResult] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [btnPulse, setBtnPulse] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCriminal = FASES[fase].minPct === null;
  const canCalc = isCriminal || valorRaw > 0;

  // Marca dirty e dispara animação no botão a cada mudança
  useEffect(() => {
    if (!hasResult) return; // antes do primeiro cálculo, não pisca
    setDirty(true);
    setBtnPulse(true);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setBtnPulse(false), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, valorRaw, complexidade, modelo, exitoPct]);

  const result = useMemo(
    () => calculate(calcFase, calcValor, calcComplexidade),
    [calcFase, calcValor, calcComplexidade],
  );

  const proposta = useMemo(
    () => (hasResult ? gerarProposta(calcFase, calcModelo, result, calcValor, calcComplexidade, calcExitoPct) : ''),
    [hasResult, calcFase, calcModelo, result, calcValor, calcComplexidade, calcExitoPct],
  );

  function handleCalc() {
    setCalcFase(fase);
    setCalcValor(valorRaw);
    setCalcComplexidade(complexidade);
    setCalcModelo(modelo);
    setCalcExitoPct(exitoPct);
    setHasResult(true);
    setDirty(false);
    setBtnPulse(false);
  }

  function copyProposta() {
    navigator.clipboard.writeText(proposta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-full bg-[#0a0a0a] p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-100">Calculadora de Honorários</h1>
          <p className="text-xs text-slate-500">Baseada na Tabela OAB de Honorários Mínimos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Formulário ────────────────────────────────────────────── */}
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dados da causa</p>

          {/* Fase */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Fase processual</label>
            <select
              value={fase}
              onChange={(e) => setFase(e.target.value as FaseKey)}
              className="w-full bg-[#1a1a1a] border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              {(Object.keys(FASES) as FaseKey[]).map((k) => (
                <option key={k} value={k} className="bg-[#1a1a1a]">{FASES[k].label}</option>
              ))}
            </select>
          </div>

          {/* Valor da causa */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Valor da causa</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={displayCurrency(valorRaw)}
                onChange={(e) => setValorRaw(parseCurrency(e.target.value))}
                placeholder="0,00"
                disabled={isCriminal}
                className="w-full bg-[#1a1a1a] border border-white/[0.07] rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
            {isCriminal && (
              <p className="text-xs text-slate-600 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
                Causas criminais usam tabela de faixa fixa — valor da causa não é aplicado.
              </p>
            )}
          </div>

          {/* Complexidade */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Complexidade
              {isCriminal && (
                <span className="ml-2 text-xs text-slate-600 font-normal">
                  (indica posição sugerida na faixa)
                </span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['simples', 'medio', 'complexo'] as Complexidade[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setComplexidade(c)}
                  className={`py-2.5 px-2 rounded-lg border text-xs font-medium transition-all text-center ${
                    complexidade === c
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#1a1a1a] border-white/[0.07] text-slate-400 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  {{ simples: 'Simples', medio: 'Médio', complexo: 'Complexo' }[c]}
                  <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                    {{ simples: '×1,0', medio: '×1,3', complexo: '×1,6' }[c]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Modelo de honorários */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Modelo de cobrança</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['fixo',  'Fixo'],
                ['exito', 'Êxito'],
                ['misto', 'Misto'],
              ] as [Modelo, string][]).map(([m, lbl]) => (
                <button
                  key={m}
                  onClick={() => setModelo(m)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                    modelo === m
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#1a1a1a] border-white/[0.07] text-slate-400 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* % de êxito */}
          {(modelo === 'exito' || modelo === 'misto') && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Percentual de êxito: <span className="text-indigo-400">{exitoPct}%</span>
              </label>
              <input
                type="range"
                min={5}
                max={40}
                step={5}
                value={exitoPct}
                onChange={(e) => setExitoPct(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>5%</span><span>20%</span><span>40%</span>
              </div>
            </div>
          )}

          {/* Botão calcular */}
          <button
            onClick={handleCalc}
            disabled={!canCalc}
            className={[
              'w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150',
              'flex items-center justify-center gap-2',
              canCalc
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-white/[0.04] text-slate-600 cursor-not-allowed',
              btnPulse ? 'scale-[1.02] brightness-125' : '',
              dirty && hasResult ? 'ring-2 ring-indigo-400/40' : '',
            ].join(' ')}
          >
            <Calculator className="w-4 h-4" />
            {dirty && hasResult ? 'Recalcular honorários' : 'Calcular honorários'}
          </button>
        </div>

        {/* ── Resultado ─────────────────────────────────────────────── */}
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 flex flex-col gap-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resultado</p>

          {!hasResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-3">
                <Calculator className="w-5 h-5 text-slate-700" />
              </div>
              <p className="text-sm text-slate-500">Preencha os dados e clique em</p>
              <p className="text-xs text-slate-600 mt-1 font-medium">Calcular honorários</p>
            </div>
          ) : (
            <>
              {/* Min / Max */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d0d0d] rounded-lg border border-white/[0.06] p-4">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Mínimo OAB</p>
                  <p className="text-lg font-bold text-emerald-400">{formatBRL(result.min)}</p>
                  {!result.isCriminal && result.pisoAplicado && (
                    <p className="text-[10px] text-amber-400/70 mt-1">piso aplicado</p>
                  )}
                </div>
                <div className="bg-[#0d0d0d] rounded-lg border border-white/[0.06] p-4">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Máximo OAB</p>
                  <p className="text-lg font-bold text-indigo-400">{formatBRL(result.max)}</p>
                  {!result.isCriminal && result.pisoDomainsMax && (
                    <p className="text-[10px] text-amber-400/70 mt-1">piso aplicado</p>
                  )}
                </div>
              </div>

              {/* Alerta quando piso domina tudo */}
              {!result.isCriminal && result.pisoDomainsMax && (
                <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5">
                  <Info className="w-3.5 h-3.5 text-amber-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-400/70 leading-relaxed">
                    O valor da causa é insuficiente para superar o piso OAB desta fase. O honorário mínimo se aplica independentemente do percentual.
                  </p>
                </div>
              )}

              {/* Sugestão */}
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-300/70 mb-0.5">
                    {result.isCriminal ? 'Sugerido para esta complexidade' : 'Valor sugerido'}
                  </p>
                  <p className="text-2xl font-bold text-indigo-300">{formatBRL(result.suggested)}</p>
                </div>
                <div className="text-right">
                  {!result.isCriminal && calcValor > 0 && !result.pisoDomainsMax && (
                    <p className="text-xs text-slate-600">
                      {((result.suggested / calcValor) * 100).toFixed(1)}% da causa
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5">{MULT_LABEL[calcComplexidade]}</p>
                </div>
              </div>

              {/* Fórmula */}
              <div className="bg-[#0d0d0d] rounded-lg border border-white/[0.06] px-4 py-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Como foi calculado</p>
                <p className="text-xs text-slate-400">{result.formula}</p>
              </div>

              {/* Modelo êxito */}
              {(calcModelo === 'exito' || calcModelo === 'misto') && calcValor > 0 && (
                <div className="bg-[#0d0d0d] rounded-lg border border-white/[0.06] px-4 py-3 flex justify-between items-center">
                  <p className="text-xs text-slate-500">Estimativa de êxito ({calcExitoPct}%)</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {formatBRL((calcValor * calcExitoPct) / 100)}
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-600 leading-relaxed">
                ⚖️ Valores orientativos — Tabela OAB. Consulte a seccional do seu estado.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Proposta ────────────────────────────────────────────────────── */}
      {hasResult && (
        <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rascunho de proposta</p>
            <button
              onClick={copyProposta}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-colors border border-white/[0.06]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar texto'}
            </button>
          </div>
          <pre className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-mono bg-[#0d0d0d] rounded-lg border border-white/[0.06] p-4">
            {proposta}
          </pre>
        </div>
      )}

      {/* ── Info cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Honorários Convencionados',
            text: 'Livremente ajustados entre advogado e cliente por contrato escrito, respeitando os mínimos da tabela OAB estadual.',
          },
          {
            title: 'Honorários Sucumbenciais',
            text: 'Fixados pelo juiz e pagos pela parte vencida. Pertencem exclusivamente ao advogado (art. 85 CPC).',
          },
          {
            title: 'Tabela OAB',
            text: 'Cada seccional estadual publica sua tabela de honorários mínimos. Esta calculadora segue as diretrizes gerais do CFOAB.',
          },
        ].map((c) => (
          <div key={c.title} className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">{c.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
