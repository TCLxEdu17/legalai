'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Trash2, Edit2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';

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

const emptyForm = { name: '', email: '', phone: '', cpfCnpj: '', address: '', notes: '' };

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', search],
    queryFn: () => apiClient.getClients(search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createClient(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente criado'); closeModal(); },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateClient(editingClient!.id, form),
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

  function openCreate() {
    setEditingClient(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(c: Client) {
    setEditingClient(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', cpfCnpj: c.cpfCnpj || '', address: c.address || '', notes: c.notes || '' });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingClient(null);
    setForm(emptyForm);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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

      {/* Search */}
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

      {/* Table */}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
              <h3 className="font-semibold text-slate-100">{editingClient ? 'Editar cliente' : 'Novo cliente'}</h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 text-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { key: 'name', label: 'Nome *', placeholder: 'Nome completo' },
                { key: 'email', label: 'Email', placeholder: 'email@exemplo.com' },
                { key: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999' },
                { key: 'cpfCnpj', label: 'CPF / CNPJ', placeholder: '000.000.000-00' },
                { key: 'address', label: 'Endereço', placeholder: 'Endereço completo' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                  <input
                    type="text"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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
