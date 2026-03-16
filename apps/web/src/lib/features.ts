// Feature flags — controlled via localStorage for admins
// Default values are the "safe" defaults (most features on)

export type FeatureFlag =
  | 'calculadora'
  | 'prazos'
  | 'agenda'
  | 'clientes'
  | 'minutas'
  | 'revisor'
  | 'comparador'
  | 'processos'
  | 'relatorio'
  | 'webhooks'
  | 'planos'
  | 'analise'
  | 'jurisprudencias'
  | 'api'
  | 'atualizacao'
  | 'contratos'
  | 'financeiro'
  | 'tarefas'
  | 'predicao'
  | 'procuracoes';

const DEFAULTS: Record<FeatureFlag, boolean> = {
  calculadora: true,
  prazos: true,
  agenda: true,
  clientes: true,
  minutas: true,
  revisor: true,
  comparador: true,
  processos: true,
  relatorio: true,
  webhooks: true,
  planos: true,
  analise: true,
  jurisprudencias: true,
  api: true,
  atualizacao: true,
  contratos: true,
  financeiro: true,
  tarefas: true,
  predicao: true,
  procuracoes: true,
};

const STORAGE_KEY = 'legalai_feature_flags';

function loadFlags(): Partial<Record<FeatureFlag, boolean>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function isEnabled(flag: FeatureFlag): boolean {
  try {
    const overrides = loadFlags();
    if (flag in overrides) return !!overrides[flag];
  } catch {}
  return DEFAULTS[flag] ?? true;
}

export function setFlag(flag: FeatureFlag, value: boolean): void {
  try {
    const current = loadFlags();
    current[flag] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

export function resetFlags(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function getAllFlags(): Record<FeatureFlag, boolean> {
  const overrides = loadFlags();
  return Object.fromEntries(
    (Object.keys(DEFAULTS) as FeatureFlag[]).map((flag) => [
      flag,
      flag in overrides ? !!overrides[flag] : DEFAULTS[flag],
    ]),
  ) as Record<FeatureFlag, boolean>;
}
