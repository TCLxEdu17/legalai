'use client';

import { useState, useEffect } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gavel, Search, AlertCircle, User, Building2, Clock, Scale, ExternalLink, Bell, BellOff, Trash2, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { FadeIn } from '@/components/ui/motion';

interface SavedProcess {
  id: string;
  number: string;
  title?: string;
  area?: string;
  lastMovementDate?: string;
  lastStatus?: string;
  checkEnabled: boolean;
  createdAt: string;
}


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
  const [tab, setTab] = useState<'consulta' | 'monitorados'>('consulta');
  const queryClient = useQueryClient();

  // URL param: ?q=numero
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setInput(formatInput(q)); }
  }, []);

  const { data: savedProcesses = [], isLoading: savedLoading } = useQuery<SavedProcess[]>({
    queryKey: ['savedProcesses'],
    queryFn: () => apiClient.listSavedProcesses(),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { number: string; title?: string }) => apiClient.saveProcess(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['savedProcesses'] }); toast.success('Processo adicionado ao monitoramento'); },
    onError: () => toast.error('Erro ao salvar processo'),
  });

  const deleteSavedMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteSavedProcess(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['savedProcesses'] }); toast.success('Processo removido do monitoramento'); },
  });

  const isSaved = processo ? savedProcesses.some((s) => s.number === processo.number) : false;

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
      <FadeIn>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Gavel className="w-6 h-6 text-brand-400" />
              Processos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              DataJud — CNJ · Todos os tribunais brasileiros
            </p>
          </div>
          <div className="flex gap-1 bg-[#141414] border border-white/[0.07] rounded-xl p-1 shrink-0">
            {(['consulta', 'monitorados'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand-600/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {t === 'consulta' ? 'Consultar' : `Monitorados (${savedProcesses.length})`}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Search — visible only on consulta tab */}
      {tab === 'consulta' && <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-3">
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
            {loading ? <PlanetLoader size="xs" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>
        <p className="text-xs text-slate-600">
          Ex.: TJSP → J=8, TT=26 · TJRJ → J=8, TT=19 · TRF1 → J=5, TT=01 · TRT2 → J=4, TT=02
        </p>
      </div>}

      {/* Loading state */}
      {tab === 'consulta' && loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
          <PlanetLoader size="sm" />
          <span className="text-sm">Consultando DataJud...</span>
        </div>
      )}

      {/* Result */}
      {tab === 'consulta' && processo && (
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

          {/* Source badge + monitor button */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3" />
              Dados obtidos via DataJud · Conselho Nacional de Justiça
            </div>
            <button
              onClick={() => isSaved
                ? toast.info('Processo já monitorado. Veja a aba "Monitorados".')
                : saveMutation.mutate({ number: processo.number })
              }
              disabled={saveMutation.isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isSaved
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-brand-600/10 text-brand-400 border-brand-500/20 hover:bg-brand-600/20'
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              {isSaved ? 'Monitorando' : 'Monitorar processo'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Monitorados */}
      {tab === 'monitorados' && (
        <div className="space-y-3">
          {savedLoading ? (
            <div className="flex items-center justify-center py-16"><PlanetLoader size="sm" /></div>
          ) : savedProcesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-400 font-medium">Nenhum processo monitorado</p>
              <p className="text-slate-600 text-sm mt-1">Consulte um processo e clique em "Monitorar" para receber notificações de andamento.</p>
            </div>
          ) : (
            savedProcesses.map((sp) => (
              <div key={sp.id} className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 font-mono text-sm font-semibold">{sp.number}</p>
                    {sp.title && <p className="text-slate-400 text-xs mt-0.5">{sp.title}</p>}
                    {sp.lastStatus && (
                      <p className="text-slate-500 text-xs mt-1.5 truncate">
                        Última movimentação: {sp.lastStatus}
                        {sp.lastMovementDate && <span className="text-slate-600"> · {new Date(sp.lastMovementDate).toLocaleDateString('pt-BR')}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setTab('consulta'); setInput(formatInput(sp.number)); }}
                      className="text-xs px-2.5 py-1.5 bg-brand-600/10 text-brand-400 border border-brand-500/20 rounded-lg hover:bg-brand-600/20 transition-colors"
                    >
                      Consultar
                    </button>
                    <button
                      onClick={() => deleteSavedMutation.mutate(sp.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Parar monitoramento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
