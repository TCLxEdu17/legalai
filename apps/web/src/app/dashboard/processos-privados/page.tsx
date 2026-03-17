'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, Key, Search, Clock, Crown, Lock, BookmarkPlus,
  BookmarkCheck, Trash2, Bell, Eye, EyeOff, CheckCircle2, AlertCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/motion';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { apiClient } from '@/lib/api-client';

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;

function formatInput(v: string) {
  const d = v.replace(/\D/g, '');
  let o = d;
  if (d.length > 7) o = d.slice(0, 7) + '-' + d.slice(7);
  if (d.length > 9) o = o.slice(0, 10) + '.' + o.slice(10);
  if (d.length > 13) o = o.slice(0, 15) + '.' + o.slice(15);
  if (d.length > 14) o = o.slice(0, 17) + '.' + o.slice(17);
  if (d.length > 16) o = o.slice(0, 20) + '.' + o.slice(20);
  return o.slice(0, 25);
}

interface Movimentacao {
  data: string;
  descricao: string;
}

interface ProcessResult {
  number: string;
  classe: string;
  assunto: string;
  juiz: string;
  situacao: string;
  movimentacoes: Movimentacao[];
}

interface SavedProcess {
  id: string;
  number: string;
  title?: string;
  lastStatus?: string;
  lastMovementDate?: string;
  checkEnabled: boolean;
  createdAt: string;
}

// ── OAB Credentials section ────────────────────────────────────────────────

function CredentialsSection({ configured, onSaved, onRemoved }: {
  configured: boolean;
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const [editing, setEditing] = useState(!configured);
  const [oabNumber, setOabNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleSave = async () => {
    if (!oabNumber.trim() || !password.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    setSaving(true);
    try {
      await apiClient.saveOabCredentials(oabNumber.trim(), password);
      toast.success('Credenciais OAB salvas com segurança');
      setEditing(false);
      setPassword('');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar credenciais');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await apiClient.deleteOabCredentials();
      toast.success('Credenciais removidas');
      setEditing(true);
      setOabNumber('');
      onRemoved();
    } catch {
      toast.error('Erro ao remover credenciais');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600/10 border border-brand-500/15 rounded-lg flex items-center justify-center">
            <Key className="w-4 h-4 text-brand-400" />
          </div>
          <h2 className="font-semibold text-slate-100 text-sm">Credenciais OAB</h2>
        </div>
        {configured && !editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-xs transition-colors"
            >
              Alterar
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {removing ? '...' : 'Remover'}
            </button>
          </div>
        )}
      </div>

      {configured && !editing ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-400">Carteira OAB configurada</p>
              <p className="text-xs text-emerald-500/70 mt-0.5">Credenciais salvas com segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80 font-medium">
            <Lock className="w-3 h-3" />
            Criptografado com AES-256
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Número OAB</label>
            <input
              type="text"
              value={oabNumber}
              onChange={(e) => setOabNumber(e.target.value)}
              placeholder="123456/SP"
              className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm font-mono
                         placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Senha do e-SAJ / portal OAB</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
                           placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 pt-1">
            <div className="flex-1" />
            {configured && (
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? <PlanetLoader size="xs" /> : <Key className="w-3.5 h-3.5" />}
              Salvar credenciais
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1">
            <Lock className="w-3 h-3" />
            Suas credenciais são criptografadas com AES-256 antes de serem armazenadas.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ProcessosPrivadosPage() {
  const [tab, setTab] = useState<'consulta' | 'monitorados'>('consulta');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processo, setProcesso] = useState<ProcessResult | null>(null);
  const queryClient = useQueryClient();

  const { data: credStatus, refetch: refetchCreds } = useQuery({
    queryKey: ['oabCredentialStatus'],
    queryFn: () => apiClient.getOabCredentialStatus(),
  });

  const { data: savedProcesses = [], isLoading: savedLoading } = useQuery<SavedProcess[]>({
    queryKey: ['privateProcesses'],
    queryFn: () => apiClient.listPrivateSavedProcesses(),
  });

  const saveMutation = useMutation({
    mutationFn: (numero: string) => apiClient.savePrivateProcess(numero),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privateProcesses'] });
      toast.success('Processo adicionado ao monitoramento');
    },
    onError: () => toast.error('Erro ao salvar processo'),
  });

  const deleteMutation = useMutation({
    mutationFn: (numero: string) => apiClient.deletePrivateProcess(numero),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privateProcesses'] });
      toast.success('Processo removido do monitoramento');
    },
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
      const data = await apiClient.queryPrivateProcess(input) as ProcessResult;
      setProcesso(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao consultar processo';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const configured = credStatus?.configured ?? false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-brand-400" />
              Processos Privados
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Consulte processos restritos via credenciais OAB ·{' '}
              <span className="text-amber-400/80">Exclusivo PRO</span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5" />
              PRO
            </span>
            <div className="flex gap-1 bg-[#141414] border border-white/[0.07] rounded-xl p-1">
              {(['consulta', 'monitorados'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t ? 'bg-brand-600/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'consulta' ? 'Consultar' : `Monitorados (${savedProcesses.length})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      {tab === 'consulta' && (
        <>
          {/* Credentials */}
          <CredentialsSection
            configured={configured}
            onSaved={() => refetchCreds()}
            onRemoved={() => refetchCreds()}
          />

          {/* Query form */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-100 text-sm">Consultar processo restrito</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(formatInput(e.target.value)); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="4000091-84.2025.8.26.0280"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm font-mono
                             placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
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
                disabled={loading || !configured}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                {loading ? <PlanetLoader size="xs" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
            {!configured && (
              <p className="flex items-center gap-1.5 text-xs text-amber-400/80">
                <Lock className="w-3 h-3" />
                Configure suas credenciais OAB acima para consultar processos privados.
              </p>
            )}
            {configured && (
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <Info className="w-3.5 h-3.5" />
                Exemplo: TJSP foro 0280 · Somente processos que sua OAB possui acesso
              </p>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
              <PlanetLoader size="sm" />
              <span className="text-sm">Consultando e-SAJ...</span>
            </div>
          )}

          {/* Result */}
          {processo && !loading && (
            <div className="space-y-4">
              <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
                {/* Result header */}
                <div className="p-5 border-b border-white/[0.05]">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-brand-400 font-semibold tracking-wider uppercase">Processo identificado</p>
                      <h3 className="text-lg font-mono font-bold text-slate-100">{processo.number}</h3>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {processo.classe && (
                          <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-400 uppercase">
                            {processo.classe}
                          </span>
                        )}
                        {processo.assunto && (
                          <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-400 uppercase">
                            {processo.assunto}
                          </span>
                        )}
                        {processo.situacao && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] text-emerald-400 uppercase">
                            {processo.situacao}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => isSaved
                        ? toast.info('Já monitorado. Veja a aba "Monitorados".')
                        : saveMutation.mutate(processo.number)
                      }
                      disabled={saveMutation.isPending}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
                        isSaved
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-brand-600/10 hover:bg-brand-600/20 text-brand-400 border-brand-500/20'
                      }`}
                    >
                      {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      {isSaved ? 'Monitorando' : 'Adicionar ao monitoramento'}
                    </button>
                  </div>

                  {processo.juiz && (
                    <div className="mt-4 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Juiz Prolator</p>
                      <p className="text-sm text-slate-300">{processo.juiz}</p>
                    </div>
                  )}
                </div>

                {/* Movimentações */}
                {processo.movimentacoes.length > 0 && (
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <h4 className="text-sm font-semibold text-slate-300">
                        Movimentações ({processo.movimentacoes.length})
                      </h4>
                    </div>
                    <div className="space-y-0">
                      {processo.movimentacoes.map((m, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                              i === 0 ? 'bg-brand-500 shadow-[0_0_8px_rgba(98,128,253,0.5)]' : 'bg-slate-700'
                            }`} />
                            {i < processo.movimentacoes.length - 1 && (
                              <div className="w-px flex-1 bg-white/[0.06] mt-1" />
                            )}
                          </div>
                          <div className="pb-5">
                            <p className="text-[10px] text-slate-500 font-mono">{m.data}</p>
                            <p className={`text-sm ${i === 0 ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                              {m.descricao}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="flex items-center justify-center gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                <p className="text-[11px] text-slate-600 text-center">
                  Consulta realizada com autenticação segura via e-SAJ. Nenhuma credencial foi exposta.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Monitorados */}
      {tab === 'monitorados' && (
        <div className="space-y-3">
          {savedLoading ? (
            <div className="flex items-center justify-center py-16">
              <PlanetLoader size="sm" />
            </div>
          ) : savedProcesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-400 font-medium">Nenhum processo monitorado</p>
              <p className="text-slate-600 text-sm mt-1">
                Consulte um processo e clique em "Adicionar ao monitoramento".
              </p>
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
                        Última mov.: {sp.lastStatus}
                        {sp.lastMovementDate && (
                          <span className="text-slate-600">
                            {' · '}{new Date(sp.lastMovementDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
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
                      onClick={() => deleteMutation.mutate(sp.number)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Remover monitoramento"
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
