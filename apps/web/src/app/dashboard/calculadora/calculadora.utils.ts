// ─── Tabela OAB ────────────────────────────────────────────────────────────
// minPct / maxPct em %. minFixed = piso mínimo independente de complexidade.
// Para criminal: faixa fixa, complexidade desloca a sugestão dentro da faixa.

// Tabela baseada nas diretrizes gerais do CFOAB e tabelas estaduais de referência (OAB-SP/MG/SC/RS).
// Os valores orientativos: cada seccional publica sua tabela anualmente.
export const FASES = {
  consultoria:    { label: 'Consultoria / Parecer',           minPct: 5,    maxPct: 15,   minFixed: 1500,  maxFixed: null   },
  extrajudicial:  { label: 'Extrajudicial / Negociação',      minPct: 5,    maxPct: 10,   minFixed: 1500,  maxFixed: null   },
  primeira:       { label: '1ª Instância',                    minPct: 10,   maxPct: 20,   minFixed: 3500,  maxFixed: null   },
  segunda:        { label: '2ª Instância (Recurso)',          minPct: 5,    maxPct: 15,   minFixed: 2500,  maxFixed: null   },
  superior:       { label: 'Tribunal Superior (STJ / STF)',   minPct: 10,   maxPct: 20,   minFixed: 15000, maxFixed: null   },
  trabalhista:    { label: 'Trabalhista',                     minPct: 20,   maxPct: 30,   minFixed: 2000,  maxFixed: null   },
  inventario:     { label: 'Inventário / Partilha',           minPct: 6,    maxPct: 10,   minFixed: 3000,  maxFixed: null   },
  criminal:       { label: 'Criminal',                        minPct: null, maxPct: null, minFixed: 2500,  maxFixed: 25000  },
  criminal_juri:  { label: 'Criminal — Júri',                 minPct: null, maxPct: null, minFixed: 4000,  maxFixed: 35000  },
} as const;

export type FaseKey = keyof typeof FASES;
export type Complexidade = 'simples' | 'medio' | 'complexo';
export type Modelo = 'fixo' | 'exito' | 'misto';

export const MULT: Record<Complexidade, number> = { simples: 1.0, medio: 1.3, complexo: 1.6 };
export const MULT_LABEL: Record<Complexidade, string> = { simples: 'Simples ×1,0', medio: 'Médio ×1,3', complexo: 'Complexo ×1,6' };

// Para causas criminais: complexidade indica a posição sugerida dentro da faixa fixa
export const CRIMINAL_PCT: Record<Complexidade, number> = { simples: 0.2, medio: 0.5, complexo: 0.9 };

export const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const parseCurrency = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) / 100 : 0;
};

export const displayCurrency = (v: number): string =>
  v === 0
    ? ''
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

// ─── Lógica de cálculo ─────────────────────────────────────────────────────

export interface Result {
  min: number;
  max: number;
  suggested: number;
  pisoAplicado: boolean;
  pisoDomainsMax: boolean;
  formula: string;
  isCriminal: boolean;
}

export function calculate(fase: FaseKey, valor: number, complexidade: Complexidade): Result {
  const f = FASES[fase];
  const mult = MULT[complexidade];
  const isCriminal = f.minPct === null;

  if (isCriminal) {
    const maxFixed = (f as { minFixed: number; maxFixed: number }).maxFixed;
    const range = maxFixed - f.minFixed;
    const suggested = f.minFixed + range * CRIMINAL_PCT[complexidade];
    return {
      min: f.minFixed,
      max: maxFixed,
      suggested: Math.round(suggested / 100) * 100,
      pisoAplicado: false,
      pisoDomainsMax: false,
      formula: `Faixa fixa OAB: ${formatBRL(f.minFixed)} – ${formatBRL(maxFixed)}. Complexidade posiciona a sugestão na faixa.`,
      isCriminal: true,
    };
  }

  // Faixa OAB com multiplicador de complexidade
  const rawMin = (valor * f.minPct! * mult) / 100;
  const rawMax = (valor * f.maxPct! * mult) / 100;

  // Piso aplica ao mínimo; máximo é o teto da tabela ou o piso se a causa for muito pequena
  const minVal = Math.max(f.minFixed, rawMin);
  const maxVal = Math.max(minVal, rawMax);

  const pisoAplicado   = rawMin < f.minFixed;
  const pisoDomainsMax = rawMax < f.minFixed; // piso engoliu o intervalo todo

  // Sugestão: ponto médio da faixa (já com complexidade), clamped entre min e max
  const midPct    = (f.minPct! + f.maxPct!) / 2;
  const rawSugg   = (valor * midPct * mult) / 100;
  const suggested = Math.min(maxVal, Math.max(minVal, rawSugg));

  let formula: string;
  if (pisoDomainsMax) {
    formula = `Valor da causa insuficiente para gerar honorários acima do piso OAB (${f.minPct}–${f.maxPct}% × ${mult.toFixed(1)} = ${formatBRL(rawMin)} – ${formatBRL(rawMax)} < piso ${formatBRL(f.minFixed)})`;
  } else if (pisoAplicado) {
    formula = `Mínimo: piso OAB ${formatBRL(f.minFixed)} (${f.minPct}% × ${mult.toFixed(1)} = ${formatBRL(rawMin)} < piso). Máximo: ${formatBRL(valor)} × ${f.maxPct}% × ${mult.toFixed(1)} = ${formatBRL(rawMax)}. Sugerido: ${formatBRL(suggested)}`;
  } else {
    formula = `${formatBRL(valor)} × ${f.minPct}% × ${mult.toFixed(1)} = ${formatBRL(rawMin)} / × ${f.maxPct}% × ${mult.toFixed(1)} = ${formatBRL(rawMax)}. Sugerido: ${formatBRL(suggested)}`;
  }

  return { min: minVal, max: maxVal, suggested, pisoAplicado, pisoDomainsMax, formula, isCriminal: false };
}

export function gerarProposta(
  fase: FaseKey,
  modelo: Modelo,
  result: Result,
  valor: number,
  complexidade: Complexidade,
  exito: number,
): string {
  const faseLabel = FASES[fase].label;
  const now = new Date().toLocaleDateString('pt-BR');

  const linhas: string[] = [
    `PROPOSTA DE HONORÁRIOS ADVOCATÍCIOS`,
    `Data: ${now}`,
    ``,
    `Referência: ${faseLabel}`,
    `Complexidade: ${MULT_LABEL[complexidade]}`,
    valor > 0 ? `Valor da causa: ${formatBRL(valor)}` : '',
    ``,
  ];

  if (modelo === 'fixo') {
    linhas.push(
      `MODELO: HONORÁRIOS FIXOS`,
      ``,
      `Honorários mínimos (OAB): ${formatBRL(result.min)}`,
      `Honorários máximos (OAB): ${formatBRL(result.max)}`,
      `Valor sugerido: ${formatBRL(result.suggested)}`,
    );
  } else if (modelo === 'exito') {
    linhas.push(
      `MODELO: HONORÁRIOS DE ÊXITO`,
      ``,
      `Percentual sobre o benefício obtido: ${exito}%`,
      `Estimativa sobre valor da causa: ${formatBRL((valor * exito) / 100)}`,
      `Obs.: Nenhum honorário fixo antecipado.`,
    );
  } else {
    const fixo = result.min * 0.5;
    linhas.push(
      `MODELO: HONORÁRIOS MISTOS`,
      ``,
      `Honorário fixo (entrada): ${formatBRL(fixo)}`,
      `Honorário de êxito: ${exito}% sobre o benefício obtido`,
      `Estimativa de êxito: ${formatBRL((valor * exito) / 100)}`,
    );
  }

  linhas.push(
    ``,
    `Base: Tabela de Honorários OAB. Valores orientativos — sujeitos a negociação e contrato escrito.`,
  );

  return linhas.filter((l) => l !== undefined).join('\n');
}
