'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Rate {
  code: string;
  label: string;
  bid: string;
  pctChange: string;
  high: string;
  low: string;
}

async function fetchRates(): Promise<Rate[]> {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,BTC-BRL,ETH-BRL');
    const data = await res.json();
    return [
      { code: 'USD/BRL', label: 'Dólar',   ...pick(data.USDBRL) },
      { code: 'BTC/BRL', label: 'Bitcoin',  ...pick(data.BTCBRL) },
      { code: 'ETH/BRL', label: 'Ethereum', ...pick(data.ETHBRL) },
    ];
  } catch {
    return [];
  }
}

function pick(d: any) {
  return { bid: d?.bid ?? '0', pctChange: d?.pctChange ?? '0', high: d?.high ?? '0', low: d?.low ?? '0' };
}

function fmt(val: string, code: string) {
  const n = parseFloat(val);
  if (code === 'USD/BRL') return `R$ ${n.toFixed(2)}`;
  if (code === 'BTC/BRL') return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

function TickerItem({ rate }: { rate: Rate }) {
  const pct = parseFloat(rate.pctChange);
  const isUp = pct >= 0;
  return (
    <span className="inline-flex items-center gap-2.5 px-6">
      <span className="text-slate-600 font-medium">{rate.code}</span>
      <span className="text-slate-300 font-mono font-semibold">{fmt(rate.bid, rate.code)}</span>
      <span className={`inline-flex items-center gap-0.5 font-medium text-[10px] ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isUp ? '+' : ''}{pct.toFixed(2)}%
      </span>
      <span className="text-slate-700 text-[10px]">
        ↑{parseFloat(rate.high).toLocaleString('pt-BR', { maximumFractionDigits: rate.code === 'USD/BRL' ? 2 : 0 })}
        &nbsp;↓{parseFloat(rate.low).toLocaleString('pt-BR', { maximumFractionDigits: rate.code === 'USD/BRL' ? 2 : 0 })}
      </span>
      <span className="text-white/10 px-2">|</span>
    </span>
  );
}

export function DollarTicker() {
  const [rates, setRates] = useState<Rate[]>([]);

  useEffect(() => {
    fetchRates().then(setRates);
    const id = setInterval(() => fetchRates().then(setRates), 60000);
    return () => clearInterval(id);
  }, []);

  if (rates.length === 0) return null;

  // Duplica o conteúdo para loop contínuo
  const content = [...rates, ...rates, ...rates];

  return (
    <div className="h-7 bg-[#080808] border-t border-white/[0.04] flex items-center shrink-0 overflow-hidden text-[11px]">
      <div className="ticker-track whitespace-nowrap">
        {content.map((r, i) => (
          <TickerItem key={`${r.code}-${i}`} rate={r} />
        ))}
      </div>
    </div>
  );
}
