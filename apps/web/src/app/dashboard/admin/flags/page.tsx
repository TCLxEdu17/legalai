'use client';

import { useState, useEffect } from 'react';
import { Flag, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { getAllFlags, setFlag, resetFlags, type FeatureFlag } from '@/lib/features';
import { isAdmin } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const FLAG_LABELS: Record<FeatureFlag, string> = {
  calculadora: 'Calculadora de Honorários',
  prazos: 'Calculadora de Prazos',
  agenda: 'Agenda de Audiências',
  clientes: 'Controle de Clientes',
  minutas: 'Minutas Automáticas',
  revisor: 'Revisor de Peças',
  comparador: 'Comparador de Decisões',
  processos: 'Consulta Processual',
  relatorio: 'Relatório Mensal',
  webhooks: 'Webhooks',
  planos: 'Planos e Uso',
  analise: 'Análise de Documento',
  jurisprudencias: 'Jurisprudências',
  api: 'API & Chaves',
};

const FLAG_DESCRIPTIONS: Record<FeatureFlag, string> = {
  calculadora: 'Calculadora de honorários advocatícios com tabelas OAB',
  prazos: 'Calculadora de prazos processuais com feriados brasileiros',
  agenda: 'Gestão de audiências com exportação ICS',
  clientes: 'CRM básico para gestão de clientes',
  minutas: 'Geração automática de minutas e peças jurídicas',
  revisor: 'Revisão de peças jurídicas com análise de IA',
  comparador: 'Comparação lado a lado de decisões judiciais',
  processos: 'Consulta processual por número CNJ (integração PJe)',
  relatorio: 'Relatório mensal com exportação PDF',
  webhooks: 'Configuração de webhooks para eventos do sistema',
  planos: 'Visualização de planos e limites de uso',
  analise: 'Análise inteligente de documentos jurídicos',
  jurisprudencias: 'Busca e consulta de jurisprudências',
  api: 'Gerenciamento de chaves de API',
};

export default function FeatureFlagsPage() {
  const router = useRouter();
  const [flags, setFlags] = useState<Record<FeatureFlag, boolean> | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      router.replace('/dashboard');
      return;
    }
    setFlags(getAllFlags());
  }, [router]);

  const toggle = (flag: FeatureFlag) => {
    if (!flags) return;
    const newValue = !flags[flag];
    setFlag(flag, newValue);
    setFlags({ ...flags, [flag]: newValue });
    setSaved(flag);
    setTimeout(() => setSaved(null), 1500);
  };

  const handleReset = () => {
    resetFlags();
    setFlags(getAllFlags());
  };

  if (!flags) return null;

  const entries = Object.entries(FLAG_LABELS) as [FeatureFlag, string][];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Flag className="w-6 h-6 text-brand-400" />
            Feature Flags
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Controle de acesso a funcionalidades — alterações aplicadas localmente
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar padrões
        </button>
      </div>

      <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden divide-y divide-white/[0.05]">
        {entries.map(([flag, label]) => {
          const enabled = flags[flag];
          const justSaved = saved === flag;
          return (
            <div
              key={flag}
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-200">{label}</p>
                  {justSaved && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">
                      salvo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{FLAG_DESCRIPTIONS[flag]}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-600" />
                )}
                <button
                  onClick={() => toggle(flag)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                    enabled ? 'bg-brand-600' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-600 text-center">
        As feature flags são armazenadas no localStorage deste navegador. Cada administrador pode ter configurações independentes.
      </p>
    </div>
  );
}
