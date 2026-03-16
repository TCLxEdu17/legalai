'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Trash2, Edit2, Loader2, X, MapPin, Building2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';
import { fetchCep, fetchCnpj, fetchUfs, fetchMunicipios, type IbgeUf, type IbgeMunicipio } from '@/lib/lookups';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { name: '', email: '', phone: '', cpfCnpj: '', address: '', uf: '', municipio: '', notes: '' };

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [lookingUpCnpj, setLookingUpCnpj] = useState(false);
  const [ufs, setUfs] = useState<IbgeUf[]>([]);
  const [municipios, setMunicipios] = useState<IbgeMunicipio[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const queryClient = useQueryClient();

  // Carrega UFs ao abrir o modal
  useEffect(() => {
    if (showModal && ufs.length === 0) {
      fetchUfs().then(setUfs).catch(() => {});
    }
  }, [showModal, ufs.length]);

  // Carrega municípios quando UF muda
  useEffect(() => {
    if (!form.uf) { setMunicipios([]); return; }
    setLoadingMunicipios(true);
    fetchMunicipios(form.uf)
      .then(setMunicipios)
      .catch(() => {})
      .finally(() => setLoadingMunicipios(false));
  }, [form.uf]);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', search],
    queryFn: () => apiClient.getClients(search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createClient(buildPayload()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente criado'); closeModal(); },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateClient(editingClient!.id, buildPayload()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente atualizado'); closeModal(); },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteClient(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente excluído'); },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.updateClient(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  function buildPayload() {
    const addr = [form.address, form.municipio, form.uf].filter(Boolean).join(', ');
    return { name: form.name, email: form.email, phone: form.phone, cpfCnpj: form.cpfCnpj, address: addr || undefined, notes: form.notes };
  }

  function parseAddress(raw: string): { street: string; uf: string; municipio: string } {
    const parts = raw.split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      return { street: parts.slice(0, -2).join(', '), municipio: parts[parts.length - 2], uf: parts[parts.length - 1] };
    }
    return { street: raw, uf: '', municipio: '' };
  }

  function openCreate() {
    setEditingClient(null);
    setForm(emptyForm);
    setMunicipios([]);
    setShowModal(true);
  }

  function openEdit(c: Client) {
    setEditingClient(c);
    const { street, uf, municipio } = parseAddress(c.address || '');
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', cpfCnpj: c.cpfCnpj || '', address: street, uf, municipio, notes: c.notes || '' });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingClient(null);
    setForm(emptyForm);
    setMunicipios([]);
  }

  async function handleCepLookup() {
    const cepDigits = form.address.replace(/\D/g, '');
    if (cepDigits.length !== 8) return;
    setLookingUpCep(true);
    try {
      const data = await fetchCep(cepDigits);
      setForm((f) => ({
        ...f,
        address: [data.logradouro, data.bairro].filter(Boolean).join(', '),
        uf: data.uf,
        municipio: data.localidade,
      }));
      toast.success('Endereço preenchido via CEP');
    } catch {
      toast.error('CEP não encontrado');
    } finally {
      setLookingUpCep(false);
    }
  }

  async function handleCnpjLookup() {
    const cnpjDigits = form.cpfCnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) return;
    setLookingUpCnpj(true);
    try {
      const data = await fetchCnpj(cnpjDigits);
      setForm((f) => ({
        ...f,
        name: f.name || data.razao_social,
        email: f.email || data.email || '',
        phone: f.phone || data.telefone1 || '',
        address: f.address || [data.logradouro, data.numero, data.bairro].filter(Boolean).join(', '),
        uf: f.uf || data.uf,
        municipio: f.municipio || data.municipio,
      }));
      toast.success('Dados preenchidos via CNPJ');
    } catch {
      toast.error('CNPJ não encontrado');
    } finally {
      setLookingUpCnpj(false);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = "w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500";
  const selectCls = "w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-400" />
              Clientes
            </h1>
            <p className="text-slate-500 text-sm mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" />
            Novo cliente
          </button>
        </div>
      </FadeIn>

      {/* Search */}
      <FadeIn delay={0.1}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF/CNPJ ou email..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                       placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </FadeIn>

      {/* Table */}
      <FadeIn delay={0.15}>
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">Nenhum cliente encontrado</p>
              <p className="text-slate-500 text-sm mt-1">{search ? 'Tente outros termos' : 'Adicione o primeiro cliente'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Contato</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">CPF/CNPJ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-200">{c.name}</p>
                      {c.notes && <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[200px]">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-slate-400 text-xs">{c.email || '—'}</p>
                      <p className="text-slate-500 text-xs">{c.phone || ''}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-slate-400 text-xs font-mono">{c.cpfCnpj || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: c.id, isActive: !c.isActive })}
                        className={cn('text-xs font-medium px-2 py-0.5 rounded-full transition-colors', c.isActive ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-white/5 text-slate-500 hover:bg-white/10')}
                      >
                        {c.isActive ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="text-slate-500 hover:text-brand-400 transition-colors p-1 rounded" title="Editar">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Excluir ${c.name}?`)) deleteMutation.mutate(c.id); }} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </FadeIn>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
              <h3 className="font-semibold text-slate-100">{editingClient ? 'Editar cliente' : 'Novo cliente'}</h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">

              {/* CPF/CNPJ com lookup */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">CPF / CNPJ</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.cpfCnpj}
                    onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
                    onBlur={() => { if (form.cpfCnpj.replace(/\D/g, '').length === 14) handleCnpjLookup(); }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className={inputCls}
                  />
                  <button type="button" onClick={handleCnpjLookup}
                    disabled={lookingUpCnpj || form.cpfCnpj.replace(/\D/g, '').length !== 14}
                    className="shrink-0 px-2.5 py-2 bg-brand-600/15 border border-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-600/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Buscar CNPJ"
                  >
                    {lookingUpCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">CNPJ: sai do campo ou clica no ícone para preencher automaticamente</p>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nome *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo ou Razão Social" className={inputCls} />
              </div>

              {/* Email + Telefone em grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Email</label>
                  <input type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Telefone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className={inputCls} />
                </div>
              </div>

              {/* Endereço (rua/bairro) + CEP lookup */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Logradouro / Bairro</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    onBlur={() => { if (form.address.replace(/\D/g, '').length === 8 && !form.address.includes(',')) handleCepLookup(); }}
                    placeholder="CEP ou logradouro e bairro"
                    className={inputCls}
                  />
                  <button type="button" onClick={handleCepLookup}
                    disabled={lookingUpCep || form.address.replace(/\D/g, '').length !== 8}
                    className="shrink-0 px-2.5 py-2 bg-brand-600/15 border border-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-600/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Buscar CEP"
                  >
                    {lookingUpCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Digite o CEP e clique no ícone para preencher UF/município</p>
              </div>

              {/* UF + Município via IBGE */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">UF</label>
                  <div className="relative">
                    <select value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value, municipio: '' })} className={selectCls}>
                      <option value="">Estado</option>
                      {ufs.map((u) => <option key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Município {loadingMunicipios && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                  </label>
                  <div className="relative">
                    <select value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} disabled={!form.uf || loadingMunicipios} className={cn(selectCls, (!form.uf || loadingMunicipios) && 'opacity-50 cursor-not-allowed')}>
                      <option value="">Município</option>
                      {municipios.map((m) => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <button
                onClick={() => editingClient ? updateMutation.mutate() : createMutation.mutate()}
                disabled={!form.name || isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingClient ? 'Atualizar' : 'Salvar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
