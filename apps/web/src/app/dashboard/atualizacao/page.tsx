'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  corrigirPeloIPCA,
  calcularJurosMoratorios,
  calcularTabelaTJSP,
  formatCurrency,
} from './atualizacao.utils';

type Indice = 'IPCA' | 'SELIC' | 'TR' | 'TJSP';

interface ResultadoCalculo {
  principal: number;
  correcao: number;
  juros: number;
  total: number;
  indice: Indice;
}

// Approximate SELIC correction (simplified: uses fixed rate lookup)
function corrigirPelaSELIC(valor: number, dataInicio: string, dataFim: string): number {
  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  const anos = (end.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000);
  // Approximate SELIC ~10.5% p.a. (2023-2024 average)
  return valor * Math.pow(1.105, anos);
}

// TR correction (minimal — TR has been near 0 since 2012, tiny correction)
function corrigirPelaTR(valor: number, dataInicio: string, dataFim: string): number {
  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  const anos = (end.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000);
  // TR ~0.5% a.a. approximate (simplified)
  return valor * Math.pow(1.005, anos);
}

export default function AtualizacaoPage() {
  const [valor, setValor] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [indice, setIndice] = useState<Indice>('IPCA');
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);

  function calcular() {
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || !dataInicio || !dataFim) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (dataFim <= dataInicio) {
      toast.error('Data final deve ser posterior à data inicial');
      return;
    }

    let res: ResultadoCalculo;

    if (indice === 'TJSP') {
      const tjsp = calcularTabelaTJSP(valorNum, dataInicio, dataFim);
      res = { ...tjsp, indice };
    } else {
      let valorCorrigido: number;
      if (indice === 'IPCA') {
        valorCorrigido = corrigirPeloIPCA(valorNum, dataInicio, dataFim);
      } else if (indice === 'SELIC') {
        valorCorrigido = corrigirPelaSELIC(valorNum, dataInicio, dataFim);
      } else {
        valorCorrigido = corrigirPelaTR(valorNum, dataInicio, dataFim);
      }

      const start = new Date(dataInicio);
      const end = new Date(dataFim);
      const meses = Math.max(
        0,
        (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()),
      );
      const valorComJuros = calcularJurosMoratorios(valorCorrigido, meses);

      res = {
        principal: valorNum,
        correcao: Math.round((valorCorrigido - valorNum) * 100) / 100,
        juros: Math.round((valorComJuros - valorCorrigido) * 100) / 100,
        total: Math.round(valorComJuros * 100) / 100,
        indice,
      };
    }

    setResultado(res);
  }

  function copiarResultado() {
    if (!resultado) return;
    const texto = `Atualização Monetária (${resultado.indice})
Principal: ${formatCurrency(resultado.principal)}
Correção monetária: ${formatCurrency(resultado.correcao)}
Juros moratórios (1% a.m.): ${formatCurrency(resultado.juros)}
TOTAL ATUALIZADO: ${formatCurrency(resultado.total)}`;
    navigator.clipboard.writeText(texto);
    toast.success('Resultado copiado para a área de transferência');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Atualização Monetária</h1>
          <p className="text-slate-500 text-sm mt-1">
            Calcule a correção monetária e juros moratórios pelos índices IPCA, SELIC, TR ou Tabela TJSP
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Valor Principal (R$)
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Índice de Correção
            </label>
            <select
              value={indice}
              onChange={(e) => setIndice(e.target.value as Indice)}
              className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500/50"
            >
              <option value="IPCA">IPCA (Índice de Preços ao Consumidor Amplo)</option>
              <option value="SELIC">SELIC (Taxa Básica de Juros)</option>
              <option value="TR">TR (Taxa Referencial)</option>
              <option value="TJSP">Tabela TJSP (IPCA + 1% a.m. juros)</option>
            </select>
          </div>

          <button
            onClick={calcular}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Calcular Atualização
          </button>
        </div>

        {/* Result */}
        {resultado && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                Resultado — {resultado.indice}
              </h2>
              <button
                onClick={copiarResultado}
                className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                Copiar resultado
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/[0.06]">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-3 px-4 text-slate-400">Principal</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200">
                      {formatCurrency(resultado.principal)}
                    </td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-3 px-4 text-slate-400">Correção monetária ({resultado.indice})</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      + {formatCurrency(resultado.correcao)}
                    </td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-3 px-4 text-slate-400">Juros moratórios (1% a.m.)</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      + {formatCurrency(resultado.juros)}
                    </td>
                  </tr>
                  <tr className="bg-white/[0.02]">
                    <td className="py-3 px-4 font-semibold text-slate-100">Total Atualizado</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-brand-400 text-base">
                      {formatCurrency(resultado.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-600">
              * Cálculo baseado em tabelas estáticas de referência. Para uso oficial, consulte a
              calculadora do CNJ ou do TJSP.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
