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

type TipoContrato = 'fixo' | 'exito' | 'misto';

export default function ContratosPage() {
  const [tipo, setTipo] = useState<TipoContrato>('fixo');
  const [clienteNome, setClienteNome] = useState('');
  const [advogadoNome, setAdvogadoNome] = useState('');
  const [objeto, setObjeto] = useState('');
  const [valor, setValor] = useState('');
  const [percentual, setPercentual] = useState('');
  const [prazo, setPrazo] = useState('');
  const [oabAdvogado, setOabAdvogado] = useState('');
  const [loading, setLoading] = useState(false);
  const [contrato, setContrato] = useState<string | null>(null);

  async function gerarContrato() {
    if (!clienteNome || !objeto) {
      toast.error('Preencha o nome do cliente e o objeto do contrato');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        tipo,
        clienteNome,
        advogadoNome: advogadoNome || undefined,
        objeto,
        prazo: prazo || undefined,
        oabAdvogado: oabAdvogado || undefined,
      };
      if ((tipo === 'fixo' || tipo === 'misto') && valor) {
        payload.valor = parseFloat(valor);
      }
      if ((tipo === 'exito' || tipo === 'misto') && percentual) {
        payload.percentual = parseFloat(percentual);
      }

      const res = await fetch(`${API_URL}/api/v1/contratos/gerar`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setContrato(data.contrato);
      } else {
        toast.error('Erro ao gerar contrato');
      }
    } catch {
      toast.error('Erro ao gerar contrato');
    } finally {
      setLoading(false);
    }
  }

  function baixarPDF() {
    if (!contrato) return;
    const blob = new Blob([contrato], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-honorarios-${clienteNome.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Contratos de Honorários</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gere contratos de prestação de serviços advocatícios com cláusulas OAB-compatíveis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Honorários</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoContrato)}
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
              >
                <option value="fixo">Honorários Fixos</option>
                <option value="exito">Honorários de Êxito</option>
                <option value="misto">Misto (Fixo + Êxito)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Cliente *</label>
              <input
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Advogado</label>
              <input
                value={advogadoNome}
                onChange={(e) => setAdvogadoNome(e.target.value)}
                placeholder="Ex: Dr. Carlos Lima"
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">OAB do Advogado</label>
              <input
                value={oabAdvogado}
                onChange={(e) => setOabAdvogado(e.target.value)}
                placeholder="Ex: SP 123456"
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Objeto *</label>
              <textarea
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
                rows={2}
                placeholder="Ex: Representação em ação trabalhista..."
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
              />
            </div>

            {(tipo === 'fixo' || tipo === 'misto') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor Fixo (R$)</label>
                <input
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>
            )}

            {(tipo === 'exito' || tipo === 'misto') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Percentual de Êxito (%)</label>
                <input
                  type="number"
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                  placeholder="Ex: 20"
                  className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Prazo estimado</label>
              <input
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                placeholder="Ex: 12 meses"
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <button
              onClick={gerarContrato}
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Gerando...' : 'Gerar Contrato'}
            </button>
          </div>

          {/* Preview */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Preview do Contrato</h2>
              {contrato && (
                <div className="flex gap-2">
                  <button
                    onClick={baixarPDF}
                    className="text-xs bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Baixar
                  </button>
                  <button
                    onClick={() => toast.info('Assinatura digital em breve')}
                    className="text-xs bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Enviar p/ Assinatura
                  </button>
                </div>
              )}
            </div>
            {contrato ? (
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto max-h-[500px]">
                {contrato}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                Preencha o formulário e clique em Gerar Contrato
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
