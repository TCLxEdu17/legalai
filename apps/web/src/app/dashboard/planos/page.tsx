'use client';

import { useState, useEffect, Suspense } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import PricingSection from '@/components/ui/pricing-section';

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
        {limit !== null ? (
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        ) : (
          <div className="h-full rounded-full bg-violet-500 opacity-30 w-full" />
        )}
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
      {/* Header */}
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
            {loadingPortal ? <PlanetLoader size="xs" /> : <ExternalLink className="w-4 h-4" />}
            Gerenciar assinatura
          </button>
        )}
      </div>

      {/* Uso atual */}
      {!isLoading && planInfo && (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Uso este mês</h2>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full capitalize font-medium",
              planInfo.plan === 'pro' ? 'bg-brand-600/15 text-brand-400' :
              planInfo.plan === 'unlimited' ? 'bg-violet-600/15 text-violet-400' :
              'bg-slate-700/30 text-slate-400'
            )}>
              {planInfo.plan}
            </span>
          </div>
          <div className="space-y-4">
            <UsageBar used={planInfo.usage.chatMessages} limit={planInfo.limits.chatMessages} label="Mensagens de chat" />
            <UsageBar used={planInfo.usage.uploads} limit={planInfo.limits.uploads} label="Uploads de documentos" />
            <UsageBar used={planInfo.usage.apiCalls} limit={planInfo.limits.apiCalls} label="Chamadas de API" />
          </div>
        </div>
      )}

      {/* Pricing section */}
      <div className="-mx-4 sm:-mx-6 rounded-2xl overflow-hidden">
        <PricingSection
          currentPlan={planInfo?.plan}
          onSelectPlan={handleCheckout}
          loadingPlan={loadingPlan}
        />
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
