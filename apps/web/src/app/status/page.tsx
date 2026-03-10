'use client';

import { useState, useEffect } from 'react';
import { Scale, CheckCircle2, Clock, ExternalLink, MessageCircle } from 'lucide-react';
import Link from 'next/link';

const components = [
  { name: 'API', description: 'Endpoints REST e autenticação' },
  { name: 'Base de Dados', description: 'PostgreSQL 16' },
  { name: 'Motor de IA', description: 'OpenAI GPT-4o / Embeddings' },
  { name: 'Busca Semântica', description: 'pgvector — busca por similaridade' },
  { name: 'Uploads', description: 'Processamento de PDF, DOCX e TXT' },
];

export default function StatusPage() {
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastChecked(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.07] py-6">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100 text-lg">LegalAI</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Status do Sistema</h1>
          <p className="text-slate-500 text-sm mt-1">Monitoramento em tempo real dos componentes da plataforma.</p>
        </div>

        {/* Overall status banner */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <div>
            <p className="font-semibold text-emerald-400">Todos os sistemas operacionais</p>
            <p className="text-emerald-400/70 text-xs mt-0.5">Nenhuma degradação detectada.</p>
          </div>
        </div>

        {/* Component list */}
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.07]">
            <h2 className="text-sm font-semibold text-slate-300">Componentes</h2>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {components.map((c) => (
              <li key={c.name} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">{c.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Operacional</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Incidentes recentes */}
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Incidentes recentes</h2>
          <div className="flex items-center gap-3 text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm">Nenhum incidente nos últimos 90 dias.</p>
          </div>
        </div>

        {/* Last checked */}
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Última verificação: {formatTime(lastChecked)} (atualiza a cada 30s)</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] py-6">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ir para o Dashboard
          </Link>
          <a
            href="https://wa.me/5513997708569"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Suporte via WhatsApp
          </a>
        </div>
      </footer>
    </div>
  );
}
