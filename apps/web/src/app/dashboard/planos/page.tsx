'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Zap, Star, Infinity as InfinityIcon, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    price: 'Grátis',
    icon: Zap,
    color: 'text-slate-400',
    features: ['20 msgs/mês', '3 uploads/mês', '50 chamadas API'],
    limits: { chatMessages: 20, uploads: 3, apiCalls: 50 },
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 'R$ 97',
    period: '/mês',
    icon: Star,
    color: 'text-brand-400',
    features: ['200 msgs/mês', '20 uploads/mês', '500 chamadas API'],
    limits: { chatMessages: 200, uploads: 20, apiCalls: 500 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 297',
    period: '/mês',
    icon: Star,
    color: 'text-emerald-400',
    features: ['2.000 msgs/mês', '200 uploads/mês', '5.000 chamadas API', 'Suporte prioritário'],
    limits: { chatMessages: 2000, uploads: 200, apiCalls: 5000 },
    highlighted: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 'R$ 697',
    period: '/mês',
    icon: InfinityIcon,
    color: 'text-violet-400',
    features: ['Mensagens ilimitadas', 'Uploads ilimitados', 'API ilimitada', 'SLA dedicado'],
    limits: { chatMessages: null, uploads: null, apiCalls: null },
  },
];

function UsageBar({ used, limit, label }: { used: number; limit: number | null; label: string }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-500">
          {used} / {limit === null ? '∞' : limit}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        {limit !== null && (
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        )}
        {limit === null && <div className="h-full rounded-full bg-violet-500" style={{ width: '100%', opacity: 0.3 }} />}
      </div>
    </div>
  );
}

function PlanosContent() {
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const { data: planInfo, isLoading, refetch } = useQuery({
    queryKey: ['plan-info'],
    queryFn: () => apiClient.getPlanInfo(),
  });

  // Handle Stripe redirect callbacks
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('Assinatura ativada com sucesso!');
      refetch();
    } else if (searchParams.get('canceled') === '1') {
      toast.info('Checkout cancelado. Você pode tentar novamente.');
    }
  }, [searchParams, refetch]);

  const handleCheckout = async (planId: string) => {
    try {
      setLoadingPlan(planId);
      const { url } = await apiClient.createCheckoutSession(planId);
      window.location.href = url;
    } catch {
      toast.error('Erro ao criar sessão de pagamento');
      setLoadingPlan(null);
    }
  };

  const handlePortal = async () => {
    try {
      setLoadingPortal(true);
      const { url } = await apiClient.createPortalSession();
      window.location.href = url;
    } catch {
      toast.error('Erro ao abrir portal de assinatura');
      setLoadingPortal(false);
    }
  };

  const isPaid = planInfo?.plan && planInfo.plan !== 'trial';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-400" />
            Planos e Uso
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie seu plano e acompanhe o uso mensal</p>
        </div>
        {isPaid && (
          <button
            onClick={handlePortal}
            disabled={loadingPortal}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Gerenciar assinatura
          </button>
        )}
      </div>

      {/* Current usage */}
      {!isLoading && planInfo && (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Uso este mês</h2>
            <span className="text-xs px-2 py-1 bg-brand-600/15 text-brand-400 rounded-full capitalize font-medium">{planInfo.plan}</span>
          </div>
          <div className="space-y-4">
            <UsageBar used={planInfo.usage.chatMessages} limit={planInfo.limits.chatMessages} label="Mensagens de chat" />
            <UsageBar used={planInfo.usage.uploads} limit={planInfo.limits.uploads} label="Uploads de documentos" />
            <UsageBar used={planInfo.usage.apiCalls} limit={planInfo.limits.apiCalls} label="Chamadas de API" />
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = planInfo?.plan === plan.id;
          const Icon = plan.icon;
          const isUpgrade = plan.id !== 'trial';
          return (
            <div
              key={plan.id}
              className={cn(
                'bg-[#141414] border rounded-xl p-5 relative flex flex-col',
                isCurrent ? 'border-brand-500/40' : plan.highlighted ? 'border-emerald-500/20' : 'border-white/[0.07]'
              )}
            >
              {plan.highlighted && !isCurrent && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-bold">
                  RECOMENDADO
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] bg-brand-600 text-white px-2.5 py-0.5 rounded-full font-bold">
                  SEU PLANO
                </div>
              )}
              <Icon className={cn('w-5 h-5 mb-3', plan.color)} />
              <h3 className="font-semibold text-slate-200 text-sm">{plan.name}</h3>
              <div className="mt-1 mb-3">
                <span className="text-xl font-bold text-slate-100">{plan.price}</span>
                {(plan as any).period && <span className="text-slate-500 text-sm">{(plan as any).period}</span>}
              </div>
              <div className="space-y-1.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              {!isCurrent && isUpgrade && (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loadingPlan !== null}
                  className={cn(
                    'w-full mt-auto pt-4 py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
                    plan.highlighted
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  )}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Fazer upgrade'
                  )}
                </button>
              )}
              {isCurrent && isPaid && (
                <button
                  onClick={handlePortal}
                  disabled={loadingPortal}
                  className="w-full mt-auto pt-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs font-medium transition-colors"
                >
                  Gerenciar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlanosPage() {
  return (
    <Suspense>
      <PlanosContent />
    </Suspense>
  );
}
