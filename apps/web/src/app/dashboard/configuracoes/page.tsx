'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Users, Plus, Loader2, Shield, Trash2, CheckCircle, Clock, Copy, X } from 'lucide-react';
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

const profileNameSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
});

type ProfileNameForm = z.infer<typeof profileNameSchema>;

const profileOabSchema = z.object({
  oabNumber: z.string().min(1, 'Informe o número da OAB'),
});

type ProfileOabForm = z.infer<typeof profileOabSchema>;

export default function ConfiguracoesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => { setCurrentUser(getStoredUser()); }, []);
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');
  const [showNewUser, setShowNewUser] = useState(false);
  const [showTrialGenerator, setShowTrialGenerator] = useState(false);
  const [trialResult, setTrialResult] = useState<{ email: string; password: string; expiresAt: string; loginUrl?: string; prefix?: string; name?: string } | null>(null);
  const [trialPrefix, setTrialPrefix] = useState<'Dr.' | 'Dra.'>('Dr.');
  const [trialName, setTrialName] = useState('');
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

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
  } = useForm<ProfileNameForm>({
    resolver: zodResolver(profileNameSchema),
  });

  const {
    register: registerOab,
    handleSubmit: handleOabSubmit,
    formState: { errors: oabErrors },
  } = useForm<ProfileOabForm>({
    resolver: zodResolver(profileOabSchema),
    defaultValues: { oabNumber: currentUser?.oabNumber ?? '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileNameForm) => apiClient.updateProfile({ name: data.name }),
    onSuccess: (data) => {
      toast.success('Nome atualizado com sucesso');
      const stored = getStoredUser();
      if (stored) {
        localStorage.setItem('user', JSON.stringify({ ...stored, name: data.name }));
        setCurrentUser({ ...stored, name: data.name });
      }
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const updateOabMutation = useMutation({
    mutationFn: (data: ProfileOabForm) => apiClient.updateProfile({ oabNumber: data.oabNumber }),
    onSuccess: (data) => {
      toast.success('OAB atualizada com sucesso');
      const stored = getStoredUser();
      if (stored) {
        localStorage.setItem('user', JSON.stringify({ ...stored, oabNumber: data.oabNumber }));
        setCurrentUser((prev: any) => ({ ...prev, oabNumber: data.oabNumber }));
      }
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const onUpdateName = (data: ProfileNameForm) => {
    updateProfileMutation.mutate(data);
  };

  const onUpdateOab = (data: ProfileOabForm) => {
    updateOabMutation.mutate(data);
  };

  const updatePrefixMutation = useMutation({
    mutationFn: (prefix: string) => apiClient.updateProfile({ prefix }),
    onSuccess: (_data, prefix) => {
      toast.success('Tratamento atualizado');
      const stored = getStoredUser();
      if (stored) {
        localStorage.setItem('user', JSON.stringify({ ...stored, prefix }));
        setCurrentUser((prev: any) => ({ ...prev, prefix }));
      }
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const updatingName = updateProfileMutation.isPending;

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

  const createTrialMutation = useMutation({
    mutationFn: () => apiClient.createTrial({ prefix: trialPrefix, name: trialName }),
    onSuccess: (data: any) => {
      setTrialResult({ email: data.email, password: data.password, expiresAt: data.expiresAt, loginUrl: data.loginUrl, prefix: trialPrefix, name: trialName });
      setTrialName('');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado!`));
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie o sistema e os usuários.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {[
          { id: 'system', label: 'Sistema', icon: Settings },
          ...(isAdmin ? [{ id: 'users', label: 'Usuários', icon: Users }] : []),
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-[#141414] text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
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
          {/* Meu Perfil */}
          <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-4">
            <h2 className="font-semibold text-slate-100">Meu Perfil</h2>
            {/* Tratamento */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tratamento</label>
              <div className="flex gap-2">
                {['Dr.', 'Dra.'].map((p) => (
                  <button
                    key={p}
                    onClick={() => updatePrefixMutation.mutate(p)}
                    disabled={updatePrefixMutation.isPending}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentUser?.prefix === p
                        ? 'bg-brand-600 text-white'
                        : 'bg-[#111111] border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Name - editable */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</label>
                <form onSubmit={handleNameSubmit(onUpdateName)} className="flex gap-2">
                  <input
                    {...registerName('name')}
                    defaultValue={currentUser?.name}
                    className="flex-1 px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={updatingName}
                    className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
                  >
                    {updatingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </button>
                </form>
              </div>
              {/* Email - read only */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">E-mail</label>
                <p className="text-slate-300 text-sm py-2">{currentUser?.email}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Perfil</label>
              <p className="text-slate-300 text-sm mt-1">{currentUser?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</p>
            </div>
          </div>

          {/* OAB */}
          <div className="bg-[#141414] rounded-xl border border-white/[0.07] p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-100">OAB</h2>
              <p className="text-xs text-slate-500 mt-0.5">Número de inscrição na Ordem dos Advogados do Brasil.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Número de OAB</label>
              <form onSubmit={handleOabSubmit(onUpdateOab)} className="flex gap-2">
                <input
                  {...registerOab('oabNumber')}
                  placeholder="Ex: SP 123456"
                  className="flex-1 px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  disabled={updateOabMutation.isPending}
                  className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
                >
                  {updateOabMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                </button>
              </form>
              {oabErrors.oabNumber && (
                <p className="text-red-400 text-xs mt-1">{oabErrors.oabNumber.message}</p>
              )}
            </div>
          </div>

          {/* Info do sistema */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6">
            <h3 className="font-semibold text-slate-100 mb-4">Sobre o sistema</h3>
            <div className="space-y-3">
              {[
                { label: 'Versão', value: 'v1.6.19' },
                { label: 'Arquitetura', value: 'RAG (Retrieval-Augmented Generation)' },
                { label: 'Banco vetorial', value: 'PostgreSQL + pgvector' },
                { label: 'Embeddings', value: 'OpenAI text-embedding-3-small' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso jurídico */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-400 text-sm">
              Este sistema é uma ferramenta de apoio. As respostas não substituem
              análise jurídica formal e devem sempre ser validadas por profissional habilitado.
            </p>
          </div>

          {/* Exclusão de conta (LGPD) */}
          <div className="bg-[#141414] border border-red-500/20 rounded-xl p-6">
            <h3 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Excluir minha conta
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Remove permanentemente sua conta, histórico de conversas e chaves de API. Ação irreversível.
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Solicitar exclusão de dados
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-red-400 font-medium">Tem certeza? Isso não pode ser desfeito.</p>
                <button
                  onClick={() => deleteAccountMutation.mutate()}
                  disabled={deleteAccountMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {deleteAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar exclusão'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
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
            <p className="text-sm text-slate-400">
              {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowTrialGenerator((v) => !v); setShowNewUser(false); setTrialResult(null); }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors"
              >
                <Clock className="w-4 h-4" />
                Acesso 24h
              </button>
              <button
                onClick={() => { setShowNewUser((v) => !v); setShowTrialGenerator(false); setTrialResult(null); }}
                className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo usuário
              </button>
            </div>
          </div>

          {/* Form novo usuário */}
          {showNewUser && (
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
              <h3 className="font-semibold text-slate-100 mb-4">Criar usuário</h3>
              <form
                onSubmit={handleSubmit((data) => createUserMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome</label>
                    <input
                      {...register('name')}
                      placeholder="Nome completo"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">E-mail</label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="email@exemplo.com"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Senha</label>
                    <input
                      {...register('password')}
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Perfil</label>
                    <select
                      {...register('role')}
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                    className="px-4 py-2 text-slate-500 hover:text-slate-300 text-sm"
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

          {/* Gerador de acesso 24h */}
          {showTrialGenerator && (
            <div className="bg-[#141414] border border-amber-500/20 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Gerar acesso temporário (24h)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Cria credenciais que expiram automaticamente em 24 horas.</p>
                </div>
                <button onClick={() => { setShowTrialGenerator(false); setTrialResult(null); }} className="text-slate-600 hover:text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!trialResult ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Tratamento</label>
                      <div className="flex gap-2">
                        {(['Dr.', 'Dra.'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTrialPrefix(p)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                              trialPrefix === p
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome do advogado(a)</label>
                      <input
                        value={trialName}
                        onChange={(e) => setTrialName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => createTrialMutation.mutate()}
                      disabled={createTrialMutation.isPending || trialName.trim().length < 2}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createTrialMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                      Gerar credenciais
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <span className="text-blue-400 text-xs mt-0.5">💡</span>
                    <p className="text-blue-300 text-xs leading-relaxed">
                      Para testar o acesso sem sair da sua sessão de admin, abra o link em uma <strong>janela anônima</strong> (Ctrl+Shift+N no Chrome).
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Credenciais geradas com sucesso
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 bg-black/30 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs text-slate-500">E-mail</p>
                          <p className="text-sm font-mono text-slate-200">{trialResult.email}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(trialResult.email, 'E-mail')}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-black/30 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs text-slate-500">Senha</p>
                          <p className="text-sm font-mono text-slate-200">{trialResult.password}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(trialResult.password, 'Senha')}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Expira em: {new Date(trialResult.expiresAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        const expiresFormatted = new Date(trialResult.expiresAt).toLocaleString('pt-BR');
                        const loginUrl = trialResult.loginUrl ?? 'https://legal.lasolutions.me';
                        const text = `Olá, ${trialResult.prefix ?? ''} ${trialResult.name ?? ''}!\n\nSeu acesso ao Assistente Jurídico IA está pronto. Válido por 24h.\n\n🔗 Link: ${loginUrl}\n📧 E-mail: ${trialResult.email}\n🔑 Senha: ${trialResult.password}\n\n⏰ Expira em: ${expiresFormatted}\n\nQualquer dúvida, estou à disposição.`;
                        copyToClipboard(text, 'Mensagem');
                      }}
                      className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar mensagem para enviar
                    </button>
                    <button
                      onClick={() => setTrialResult(null)}
                      className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Gerar outro acesso
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de usuários */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Perfil</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Criado em</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-white/[0.04]">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-200 text-sm">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.role === 'ADMIN'
                            ? 'bg-brand-600/15 text-brand-400'
                            : 'bg-white/5 text-slate-400'
                        }`}>
                          {user.role === 'ADMIN' ? 'Admin' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-slate-500 text-xs">{formatDateTime(user.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="text-red-400 text-xs">Inativo</span>
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
