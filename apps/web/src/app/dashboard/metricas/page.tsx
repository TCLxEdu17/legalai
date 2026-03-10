'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  UserX,
  ThumbsUp,
  Loader2,
  Key,
  AlertTriangle,
  Zap,
  Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { isAdmin } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrialUserRow {
  id: string;
  prefix: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  feedback: 'YES' | 'NO' | null;
  feedbackGiven: boolean;
  city: string | null;
  accessCount: number;
  clickCount: number;
}

interface TrialMetricsResponse {
  total: number;
  active: number;
  expired: number;
  feedbackYes: number;
  feedbackNo: number;
  users: TrialUserRow[];
}

interface UsageKey {
  id: string;
  name: string;
  user: { id: string; name: string; email: string };
  totalRequests: number;
  requestsThisMonth: number;
  tokensThisMonth: number;
  docsIndexed: number;
  lastUsedAt: string | null;
}

interface UsageSummaryResponse {
  apiKeys: UsageKey[];
}

interface EndpointStat {
  endpoint: string;
  count: number;
  tokens: number;
}

interface TokenUsageResponse {
  totalTokensToday: number;
  totalTokensThisMonth: number;
  totalTokensAllTime: number;
  totalRequestsToday: number;
  totalRequestsThisMonth: number;
  requestsByEndpoint: EndpointStat[];
  dailyUsage: { date: string; tokens: number; requests: number }[];
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
  dot,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  dot?: 'green' | 'red';
}) {
  return (
    <div className="dark-card rounded-xl p-4 hover:border-white/[0.14] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-xs font-medium">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {dot && (
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              dot === 'green' ? 'bg-emerald-400' : 'bg-red-400',
            )}
          />
        )}
        <p className={cn('text-2xl font-bold tabular-nums', valueColor)}>{value}</p>
      </div>
    </div>
  );
}

// ─── Feedback Badge ───────────────────────────────────────────────────────────

function FeedbackBadge({ feedback }: { feedback: 'YES' | 'NO' | null }) {
  if (feedback === 'YES')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
        Sim
      </span>
    );
  if (feedback === 'NO')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
        Não
      </span>
    );
  return <span className="text-slate-600 text-sm">—</span>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MetricasPage() {
  const [admin, setAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    setAdmin(isAdmin());
    setAdminChecked(true);
  }, []);

  const {
    data: trialData,
    isLoading: trialLoading,
    isError: trialError,
  } = useQuery<TrialMetricsResponse>({
    queryKey: ['trial-metrics'],
    queryFn: () => apiClient.getTrialMetrics(),
    enabled: admin,
  });

  const {
    data: usageData,
    isLoading: usageLoading,
    isError: usageError,
  } = useQuery<UsageSummaryResponse>({
    queryKey: ['usage-summary'],
    queryFn: () => apiClient.getUsageSummary(),
    enabled: admin,
  });

  const {
    data: tokenData,
    isLoading: tokenLoading,
    isError: tokenError,
  } = useQuery<TokenUsageResponse>({
    queryKey: ['token-usage'],
    queryFn: () => apiClient.getTokenUsage(),
    enabled: adminChecked,
  });

  if (!adminChecked) return null;

  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <p className="text-slate-400 font-medium">Acesso restrito a administradores</p>
      </div>
    );
  }

  const trials = trialData?.users ?? [];
  const keys = usageData?.apiKeys ?? [];

  const feedbackPositivePct =
    trialData && trialData.feedbackYes + trialData.feedbackNo > 0
      ? Math.round(
          (trialData.feedbackYes / (trialData.feedbackYes + trialData.feedbackNo)) * 100,
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Métricas</h1>
        <p className="text-slate-500 text-sm mt-1">Usuários de Teste</p>
      </div>

      {/* Stats row */}
      {trialLoading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando métricas...
        </div>
      ) : trialError ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          Erro ao carregar métricas de trials.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total de trials"
            value={trialData?.total ?? 0}
            icon={Users}
            iconBg="bg-slate-500/15"
            iconColor="text-slate-400"
            valueColor="text-slate-100"
          />
          <StatCard
            label="Trials ativos"
            value={trialData?.active ?? 0}
            icon={UserCheck}
            iconBg="bg-emerald-500/15"
            iconColor="text-emerald-400"
            valueColor="text-emerald-400"
            dot="green"
          />
          <StatCard
            label="Trials expirados"
            value={trialData?.expired ?? 0}
            icon={UserX}
            iconBg="bg-red-500/15"
            iconColor="text-red-400"
            valueColor="text-red-400"
          />
          <StatCard
            label="Feedback positivo"
            value={`${feedbackPositivePct}%`}
            icon={ThumbsUp}
            iconBg="bg-brand-600/15"
            iconColor="text-brand-400"
            valueColor="text-brand-400"
          />
        </div>
      )}

      {/* Trials table */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Usuários de Teste</h2>
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          {trialLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando...
            </div>
          ) : trials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">Nenhum trial criado ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    {[
                      'Usuário',
                      'Cidade',
                      'Acessos',
                      'Cliques',
                      'Criado em',
                      'Expira em',
                      'Feedback',
                    ].map((col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {trials.map((t) => {
                    const expired = t.isExpired;
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-slate-200 font-medium text-sm leading-tight">
                              {t.prefix} {t.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-400 text-xs">{t.city ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-300 tabular-nums">{t.accessCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-300 tabular-nums">{t.clickCount}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-slate-400 text-xs">
                            {formatDateTime(t.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              expired ? 'text-red-400' : 'text-emerald-400',
                            )}
                          >
                            {formatDateTime(t.expiresAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <FeedbackBadge feedback={t.feedback} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Token Usage section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Uso de Tokens</h2>
          <p className="text-slate-500 text-xs mt-0.5">Baseado nos logs de requisições (UsageLog)</p>
        </div>

        {tokenLoading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando uso de tokens...
          </div>
        ) : tokenError ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            Erro ao carregar dados de tokens.
          </div>
        ) : (
          <>
            {/* 4 stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Tokens hoje"
                value={(tokenData?.totalTokensToday ?? 0).toLocaleString('pt-BR')}
                icon={Zap}
                iconBg="bg-amber-500/15"
                iconColor="text-amber-400"
                valueColor="text-amber-400"
              />
              <StatCard
                label="Tokens este mês"
                value={(tokenData?.totalTokensThisMonth ?? 0).toLocaleString('pt-BR')}
                icon={Zap}
                iconBg="bg-brand-600/15"
                iconColor="text-brand-400"
                valueColor="text-brand-400"
              />
              <StatCard
                label="Requests hoje"
                value={(tokenData?.totalRequestsToday ?? 0).toLocaleString('pt-BR')}
                icon={Activity}
                iconBg="bg-sky-500/15"
                iconColor="text-sky-400"
                valueColor="text-sky-400"
              />
              <StatCard
                label="Requests este mês"
                value={(tokenData?.totalRequestsThisMonth ?? 0).toLocaleString('pt-BR')}
                icon={Activity}
                iconBg="bg-slate-500/15"
                iconColor="text-slate-400"
                valueColor="text-slate-100"
              />
            </div>

            {/* Endpoint breakdown table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Uso por endpoint</h3>
              <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
                {!tokenData?.requestsByEndpoint?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Activity className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-slate-500 text-sm">Nenhum dado de endpoint registrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                          {['Endpoint', 'Requests', 'Tokens'].map((col) => (
                            <th
                              key={col}
                              className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {tokenData.requestsByEndpoint.map((ep) => (
                          <tr key={ep.endpoint} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-slate-300 font-mono text-xs">{ep.endpoint}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-300 tabular-nums">
                                {ep.count.toLocaleString('pt-BR')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-300 tabular-nums">
                                {ep.tokens.toLocaleString('pt-BR')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* OpenAI credits note */}
            <p className="text-xs text-slate-600">
              Créditos restantes: verifique em{' '}
              <a
                href="https://platform.openai.com/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 underline underline-offset-2"
              >
                platform.openai.com/usage
              </a>
            </p>
          </>
        )}
      </div>

      {/* Usage section */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Uso de API Keys</h2>
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          {usageLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando...
            </div>
          ) : usageError ? (
            <div className="p-6 text-center text-red-400 text-sm">
              Erro ao carregar uso de API Keys.
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Key className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">Nenhuma API key com uso registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    {[
                      'Nome da chave',
                      'Usuário',
                      'Total requests',
                      'Este mês',
                      'Tokens este mês',
                      'Docs indexados',
                      'Último uso',
                    ].map((col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-slate-200 font-medium">{k.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 text-xs">{k.user?.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 tabular-nums">
                          {k.totalRequests.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 tabular-nums">
                          {k.requestsThisMonth.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 tabular-nums">
                          {k.tokensThisMonth.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 tabular-nums">{k.docsIndexed}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-400 text-xs">
                          {k.lastUsedAt ? formatDateTime(k.lastUsedAt) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
