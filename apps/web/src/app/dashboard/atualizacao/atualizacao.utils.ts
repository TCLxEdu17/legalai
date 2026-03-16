// ─── Atualização Monetária Utilities ────────────────────────────────────────
// Índices: IPCA (static table), juros moratórios, tabela TJSP

/**
 * Static IPCA accumulated index table.
 * Key: "YYYY-MM" → accumulated index since base date (Jan 2020 = 1.0000)
 * Values are approximate annual accumulated IPCA for each year-month.
 */
const IPCA_MENSAL: Record<string, number> = {
  // 2019
  '2019-01': 0.9480, '2019-02': 0.9504, '2019-03': 0.9524, '2019-04': 0.9530,
  '2019-05': 0.9547, '2019-06': 0.9558, '2019-07': 0.9573, '2019-08': 0.9594,
  '2019-09': 0.9637, '2019-10': 0.9676, '2019-11': 0.9713, '2019-12': 0.9747,
  // 2020
  '2020-01': 1.0000, '2020-02': 1.0038, '2020-03': 1.0072, '2020-04': 1.0058,
  '2020-05': 1.0042, '2020-06': 1.0054, '2020-07': 1.0060, '2020-08': 1.0108,
  '2020-09': 1.0177, '2020-10': 1.0245, '2020-11': 1.0337, '2020-12': 1.0416,
  // 2021
  '2021-01': 1.0481, '2021-02': 1.0566, '2021-03': 1.0649, '2021-04': 1.0744,
  '2021-05': 1.0840, '2021-06': 1.0921, '2021-07': 1.0989, '2021-08': 1.1089,
  '2021-09': 1.1219, '2021-10': 1.1358, '2021-11': 1.1506, '2021-12': 1.1627,
  // 2022
  '2022-01': 1.1773, '2022-02': 1.1940, '2022-03': 1.2118, '2022-04': 1.2265,
  '2022-05': 1.2360, '2022-06': 1.2537, '2022-07': 1.2501, '2022-08': 1.2417,
  '2022-09': 1.2462, '2022-10': 1.2518, '2022-11': 1.2606, '2022-12': 1.2657,
  // 2023
  '2023-01': 1.2726, '2023-02': 1.2810, '2023-03': 1.2886, '2023-04': 1.2934,
  '2023-05': 1.2975, '2023-06': 1.2989, '2023-07': 1.2990, '2023-08': 1.3024,
  '2023-09': 1.3088, '2023-10': 1.3144, '2023-11': 1.3212, '2023-12': 1.3270,
  // 2024
  '2024-01': 1.3356, '2024-02': 1.3419, '2024-03': 1.3488, '2024-04': 1.3568,
  '2024-05': 1.3623, '2024-06': 1.3685, '2024-07': 1.3746, '2024-08': 1.3832,
  '2024-09': 1.3921, '2024-10': 1.4013, '2024-11': 1.4127, '2024-12': 1.4249,
  // 2025
  '2025-01': 1.4393, '2025-02': 1.4531, '2025-03': 1.4651, '2025-04': 1.4742,
  '2025-05': 1.4820, '2025-06': 1.4897, '2025-07': 1.4966, '2025-08': 1.5039,
  '2025-09': 1.5110, '2025-10': 1.5185, '2025-11': 1.5255, '2025-12': 1.5318,
};

function toYearMonth(dateStr: string): string {
  return dateStr.substring(0, 7); // "YYYY-MM"
}

function getIpcaIndex(dateStr: string): number {
  const ym = toYearMonth(dateStr);
  if (IPCA_MENSAL[ym] !== undefined) return IPCA_MENSAL[ym];
  // Fallback: find nearest key
  const keys = Object.keys(IPCA_MENSAL).sort();
  if (ym <= keys[0]) return IPCA_MENSAL[keys[0]];
  if (ym >= keys[keys.length - 1]) return IPCA_MENSAL[keys[keys.length - 1]];
  // Linear interpolation based on closest
  const lower = keys.filter((k) => k <= ym).pop()!;
  return IPCA_MENSAL[lower];
}

/**
 * Corrects a value by IPCA between two dates.
 * Returns the corrected value.
 */
export function corrigirPeloIPCA(valor: number, dataInicio: string, dataFim: string): number {
  if (dataInicio >= dataFim) return valor;
  const indexInicio = getIpcaIndex(dataInicio);
  const indexFim = getIpcaIndex(dataFim);
  if (indexInicio === 0) return valor;
  return valor * (indexFim / indexInicio);
}

/**
 * Calculates compound interest (juros moratórios) for a given number of months.
 * Default rate: 1% per month (Brazilian default for moratórios).
 */
export function calcularJurosMoratorios(
  valor: number,
  meses: number,
  taxaMensal = 0.01,
): number {
  if (meses <= 0) return valor;
  return valor * Math.pow(1 + taxaMensal, meses);
}

/**
 * Calculates monetary correction + interest using the TJSP table method.
 * TJSP uses: IPCA correction + 1% per month compound interest.
 * Returns breakdown: { principal, correcao, juros, total }
 */
export function calcularTabelaTJSP(
  valor: number,
  dataInicio: string,
  dataFim: string,
): {
  principal: number;
  correcao: number;
  juros: number;
  total: number;
} {
  // Step 1: Monetary correction via IPCA
  const valorCorrigido = corrigirPeloIPCA(valor, dataInicio, dataFim);
  const correcao = valorCorrigido - valor;

  // Step 2: Calculate months between dates
  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  const meses = Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()),
  );

  // Step 3: Juros moratórios on corrected value
  const valorComJuros = calcularJurosMoratorios(valorCorrigido, meses);
  const juros = valorComJuros - valorCorrigido;

  const total = valor + correcao + juros;

  return {
    principal: valor,
    correcao: Math.round(correcao * 100) / 100,
    juros: Math.round(juros * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Formats a number as Brazilian Real currency.
 * Example: 1234.50 → "R$ 1.234,50"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(value)
    .replace(/\u00a0/g, ' '); // normalize non-breaking space to regular space
}
