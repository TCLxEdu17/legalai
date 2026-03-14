'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fetchDollarRate, type CotacaoResult } from '@/lib/lookups';

export function DollarTicker() {
  const [rate, setRate] = useState<CotacaoResult | null>(null);

  useEffect(() => {
    fetchDollarRate().then(setRate).catch(() => {});
    const interval = setInterval(() => {
      fetchDollarRate().then(setRate).catch(() => {});
    }, 60000); // atualiza a cada 60s
    return () => clearInterval(interval);
  }, []);

  if (!rate) return null;

  const pct = parseFloat(rate.pctChange);
  const isUp = pct >= 0;

  return (
    <div className="h-7 bg-[#080808] border-t border-white/[0.04] flex items-center justify-center gap-6 text-[11px] shrink-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={rate.bid}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4"
        >
          <span className="text-slate-600 font-medium">USD/BRL</span>
          <span className="text-slate-300 font-mono font-semibold">
            R$ {parseFloat(rate.bid).toFixed(2)}
          </span>
          <span className={`flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? '+' : ''}{pct.toFixed(2)}%
          </span>
          <span className="text-slate-700">
            Max {parseFloat(rate.high).toFixed(2)} · Min {parseFloat(rate.low).toFixed(2)}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
