'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Users, Plus, Loader2, Shield, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getStoredUser, logout } from '@/lib/auth';
import { extractApiErrorMessage, formatDateTime } from '@/lib/utils';

const newUserSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(['ADMIN', 'USER']),
});

type NewUserForm = z.infer<typeof newUserSchema>;

export default function ConfiguracoesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => { setCurrentUser(getStoredUser()); }, []);
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');
  const [showNewUser, setShowNewUser] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiClient.deleteAccount(),
    onSuccess: async () => {
      toast.success('Conta excluída. Até logo.');
      await logout();
      router.replace('/login');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers(),
    enabled: currentUser?.role === 'ADMIN',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { role: 'USER' },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: NewUserForm) => apiClient.createUser(data),
    onSuccess: () => {
      toast.success('Usuário criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      setShowNewUser(false);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie o sistema e os usuários.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'system', label: 'Sistema', icon: Settings },
          ...(isAdmin ? [{ id: 'users', label: 'Usuários', icon: Users }] : []),
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          {/* Perfil do usuário */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Meu perfil</h3>
            <div className="space-y-3">
              {[
                { label: 'Nome', value: currentUser?.name },
                { label: 'E-mail', value: currentUser?.email },
                {
                  label: 'Perfil',
                  value: currentUser?.role === 'ADMIN' ? 'Administrador' : 'Usuário',
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info do sistema */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Sobre o sistema</h3>
            <div className="space-y-3">
              {[
                { label: 'Versão', value: '1.0.0 — MVP' },
                { label: 'Arquitetura', value: 'RAG (Retrieval-Augmented Generation)' },
                { label: 'Banco vetorial', value: 'PostgreSQL + pgvector' },
                { label: 'Embeddings', value: 'OpenAI text-embedding-3-small' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso jurídico */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm">
              Este sistema é uma ferramenta de apoio. As respostas não substituem
              análise jurídica formal e devem sempre ser validadas por profissional habilitado.
            </p>
          </div>

          {/* Exclusão de conta (LGPD) */}
          <div className="bg-white border border-red-200 rounded-xl p-6">
            <h3 className="font-semibold text-red-700 mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Excluir minha conta
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Remove permanentemente sua conta, histórico de conversas e chaves de API. Ação irreversível.
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Solicitar exclusão de dados
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-red-700 font-medium">Tem certeza? Isso não pode ser desfeito.</p>
                <button
                  onClick={() => deleteAccountMutation.mutate()}
                  disabled={deleteAccountMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {deleteAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar exclusão'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowNewUser((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo usuário
            </button>
          </div>

          {/* Form novo usuário */}
          {showNewUser && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Criar usuário</h3>
              <form
                onSubmit={handleSubmit((data) => createUserMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome</label>
                    <input
                      {...register('name')}
                      placeholder="Nome completo"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">E-mail</label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="email@exemplo.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Senha</label>
                    <input
                      {...register('password')}
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Perfil</label>
                    <select
                      {...register('role')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="USER">Usuário</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowNewUser(false); reset(); }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {createUserMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Criar usuário
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de usuários */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Perfil</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Criado em</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800 text-sm">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.role === 'ADMIN'
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'ADMIN' ? 'Admin' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-slate-500 text-xs">{formatDateTime(user.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="text-red-500 text-xs">Inativo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
