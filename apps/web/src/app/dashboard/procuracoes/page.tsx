'use client';

import { useState } from 'react';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function ProcuracoesPage() {
  const [form, setForm] = useState({
    outorgante: '',
    cpf: '',
    rg: '',
    nacionalidade: '',
    estadoCivil: '',
    advogado: '',
    oab: '',
    poderes: 'amplos',
    processoNumero: '',
    foro: 'São Paulo/SP',
    emailAssinatura: '',
  });
  const [loading, setLoading] = useState(false);
  const [procuracao, setProcuracao] = useState<string | null>(null);

  async function gerar() {
    if (!form.outorgante || !form.advogado || !form.oab) {
      toast.error('Preencha outorgante, advogado e OAB');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/procuracoes/gerar`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          outorgante: form.outorgante,
          cpf: form.cpf || undefined,
          rg: form.rg || undefined,
          nacionalidade: form.nacionalidade || undefined,
          estadoCivil: form.estadoCivil || undefined,
          advogado: form.advogado,
          oab: form.oab,
          poderes: form.poderes,
          processoNumero: form.processoNumero || undefined,
          foro: form.foro || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProcuracao(data.procuracao);
      } else {
        toast.error('Erro ao gerar procuração');
      }
    } catch {
      toast.error('Erro ao gerar procuração');
    } finally {
      setLoading(false);
    }
  }

  function baixar() {
    if (!procuracao) return;
    const blob = new Blob([procuracao], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procuracao-${form.outorgante.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function enviarAssinatura() {
    if (!form.emailAssinatura || !procuracao) {
      toast.error('Informe o e-mail do cliente para envio');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/procuracoes/enviar-assinatura`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          email: form.emailAssinatura,
          conteudo: procuracao,
          nomeCliente: form.outorgante,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.info(data.message || 'Integração com assinatura digital em breve');
      }
    } catch {
      toast.info('Integração com assinatura digital em breve');
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Procurações</h1>
          <p className="text-slate-500 text-sm mt-1">Gere procurações Ad Judicia no formato OAB</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Dados do Outorgante</h3>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Nome do Outorgante *</label>
              <input value={form.outorgante} onChange={(e) => setForm({ ...form, outorgante: e.target.value })} placeholder="Nome completo" className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">CPF</label>
                <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">RG</label>
                <input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} placeholder="00.000.000-0" className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nacionalidade</label>
                <input value={form.nacionalidade} onChange={(e) => setForm({ ...form, nacionalidade: e.target.value })} placeholder="brasileiro(a)" className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Estado Civil</label>
                <select value={form.estadoCivil} onChange={(e) => setForm({ ...form, estadoCivil: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100">
                  <option value="">Não informado</option>
                  <option value="solteiro(a)">Solteiro(a)</option>
                  <option value="casado(a)">Casado(a)</option>
                  <option value="divorciado(a)">Divorciado(a)</option>
                  <option value="viúvo(a)">Viúvo(a)</option>
                </select>
              </div>
            </div>

            <h3 className="text-sm font-medium text-slate-300 pt-2">Dados do Outorgado (Advogado)</h3>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Nome do Advogado *</label>
              <input value={form.advogado} onChange={(e) => setForm({ ...form, advogado: e.target.value })} placeholder="Ex: Dr. Carlos Lima" className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">OAB *</label>
                <input value={form.oab} onChange={(e) => setForm({ ...form, oab: e.target.value })} placeholder="Ex: SP 123456" className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Poderes</label>
                <select value={form.poderes} onChange={(e) => setForm({ ...form, poderes: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100">
                  <option value="amplos">Ad Judicia Amplos</option>
                  <option value="especiais">Especiais</option>
                  <option value="especificos">Específicos</option>
                </select>
              </div>
            </div>

            {form.poderes !== 'amplos' && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Número do Processo</label>
                <input value={form.processoNumero} onChange={(e) => setForm({ ...form, processoNumero: e.target.value })} placeholder="0000000-00.0000.0.00.0000" className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-1">Foro</label>
              <input value={form.foro} onChange={(e) => setForm({ ...form, foro: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none" />
            </div>

            <button onClick={gerar} disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
              {loading ? 'Gerando...' : 'Gerar Procuração'}
            </button>
          </div>

          {/* Preview */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Preview da Procuração</h2>
              {procuracao && (
                <div className="flex gap-2">
                  <button onClick={baixar} className="text-xs bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 px-3 py-1.5 rounded-lg transition-colors">Baixar</button>
                </div>
              )}
            </div>

            {procuracao && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">E-mail para assinatura</label>
                  <div className="flex gap-2">
                    <input value={form.emailAssinatura} onChange={(e) => setForm({ ...form, emailAssinatura: e.target.value })} placeholder="cliente@email.com" className="flex-1 bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 text-sm focus:outline-none" />
                    <button onClick={enviarAssinatura} className="text-xs bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] px-3 py-2 rounded-lg transition-colors whitespace-nowrap">Enviar p/ Assinatura</button>
                  </div>
                </div>
              </div>
            )}

            {procuracao ? (
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto max-h-[500px]">
                {procuracao}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                Preencha o formulário e clique em Gerar Procuração
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
