import { describe, it, expect } from 'vitest';
import {
  parseCurrency,
  displayCurrency,
  formatBRL,
  calculate,
  gerarProposta,
  FASES,
  MULT,
  CRIMINAL_PCT,
} from './calculadora.utils';

// ─── parseCurrency ─────────────────────────────────────────────────────────

describe('parseCurrency', () => {
  it('returns 0 for empty string', () => {
    expect(parseCurrency('')).toBe(0);
  });

  it('parses digits-only as centavos', () => {
    expect(parseCurrency('10000')).toBe(100);
  });

  it('parses formatted BRL string', () => {
    expect(parseCurrency('100.000,00')).toBe(100_000);
  });

  it('parses string with R$ prefix', () => {
    expect(parseCurrency('R$ 1.500,00')).toBe(1_500);
  });

  it('round-trips with displayCurrency', () => {
    const values = [0.01, 1, 100, 1500, 100_000, 1_000_000];
    values.forEach((v) => {
      expect(parseCurrency(displayCurrency(v))).toBe(v);
    });
  });
});

// ─── displayCurrency ───────────────────────────────────────────────────────

describe('displayCurrency', () => {
  it('returns empty string for 0', () => {
    expect(displayCurrency(0)).toBe('');
  });

  it('formats with 2 decimal places', () => {
    expect(displayCurrency(1500)).toBe('1.500,00');
  });
});

// ─── formatBRL ─────────────────────────────────────────────────────────────

describe('formatBRL', () => {
  it('formats with R$ prefix', () => {
    const formatted = formatBRL(1500);
    expect(formatted).toContain('R$');
    expect(formatted).toContain('1.500');
  });
});

// ─── calculate — casos não-criminais ───────────────────────────────────────

describe('calculate — non-criminal cases', () => {
  // ── Regra fundamental: min < max para valores razoáveis ──

  it('min must be strictly less than max for a reasonable case value', () => {
    const r = calculate('primeira', 100_000, 'simples');
    expect(r.min).toBeLessThan(r.max);
  });

  it('min must be strictly less than max across all complexities', () => {
    for (const c of ['simples', 'medio', 'complexo'] as const) {
      const r = calculate('primeira', 100_000, c);
      expect(r.min).toBeLessThan(r.max);
    }
  });

  // ── Complexidade deve afetar min e max ──

  it('higher complexity produces higher min', () => {
    const s = calculate('primeira', 100_000, 'simples');
    const m = calculate('primeira', 100_000, 'medio');
    const c = calculate('primeira', 100_000, 'complexo');
    expect(m.min).toBeGreaterThan(s.min);
    expect(c.min).toBeGreaterThan(m.min);
  });

  it('higher complexity produces higher max', () => {
    const s = calculate('primeira', 100_000, 'simples');
    const m = calculate('primeira', 100_000, 'medio');
    const c = calculate('primeira', 100_000, 'complexo');
    expect(m.max).toBeGreaterThan(s.max);
    expect(c.max).toBeGreaterThan(m.max);
  });

  // ── Sugerido deve estar entre min e max ──

  it('suggested is between min and max', () => {
    for (const c of ['simples', 'medio', 'complexo'] as const) {
      const r = calculate('primeira', 100_000, c);
      expect(r.suggested).toBeGreaterThanOrEqual(r.min);
      expect(r.suggested).toBeLessThanOrEqual(r.max);
    }
  });

  it('suggested is between min and max for all non-criminal phases', () => {
    const phases = ['consultoria', 'extrajudicial', 'primeira', 'segunda', 'superior', 'trabalhista', 'inventario'] as const;
    for (const fase of phases) {
      for (const c of ['simples', 'medio', 'complexo'] as const) {
        const r = calculate(fase, 200_000, c);
        expect(r.suggested).toBeGreaterThanOrEqual(r.min);
        expect(r.suggested).toBeLessThanOrEqual(r.max);
      }
    }
  });

  // ── Cálculo dos valores brutos com multiplicador ──

  it('calculates correct values for 1ª Instância simples', () => {
    // 1ª Instância: 10-20%, piso 3500, mult simples = 1.0
    const r = calculate('primeira', 100_000, 'simples');
    // min = max(3500, 100000 × 10% × 1.0) = max(3500, 10000) = 10000
    expect(r.min).toBe(10_000);
    // max = max(10000, 100000 × 20% × 1.0) = max(10000, 20000) = 20000
    expect(r.max).toBe(20_000);
    expect(r.pisoAplicado).toBe(false);
    expect(r.pisoDomainsMax).toBe(false);
    expect(r.isCriminal).toBe(false);
  });

  it('calculates correct values for 1ª Instância complexo', () => {
    // 1ª Instância: 10-20%, piso 3500, mult complexo = 1.6
    const r = calculate('primeira', 100_000, 'complexo');
    // min = max(3500, 100000 × 10% × 1.6) = max(3500, 16000) = 16000
    expect(r.min).toBe(16_000);
    // max = max(16000, 100000 × 20% × 1.6) = max(16000, 32000) = 32000
    expect(r.max).toBe(32_000);
  });

  it('calculates correct values for trabalhista medio', () => {
    // Trabalhista: 20-30%, piso 2000, mult medio = 1.3
    const r = calculate('trabalhista', 50_000, 'medio');
    // min = max(2000, 50000 × 20% × 1.3) = max(2000, 13000) = 13000
    expect(r.min).toBe(13_000);
    // max = max(13000, 50000 × 30% × 1.3) = max(13000, 19500) = 19500
    expect(r.max).toBe(19_500);
  });

  // ── Piso OAB (valor da causa pequeno) ──

  it('applies piso when percentage yields less than minimum', () => {
    // 1ª Instância: 10-20%, piso 3500
    // valor 20000 × 10% × 1.0 = 2000 < piso 3500
    const r = calculate('primeira', 20_000, 'simples');
    expect(r.min).toBe(3_500);
    expect(r.pisoAplicado).toBe(true);
    // max = max(3500, 20000 × 20% × 1.0) = max(3500, 4000) = 4000
    expect(r.max).toBe(4_000);
    expect(r.pisoDomainsMax).toBe(false);
  });

  it('pisoDomainsMax when even maxPct is below the floor', () => {
    // 1ª Instância: piso 3500
    // valor 10000 × 20% × 1.0 = 2000 < piso 3500
    const r = calculate('primeira', 10_000, 'simples');
    expect(r.pisoDomainsMax).toBe(true);
    // Both min and max become the piso
    expect(r.min).toBe(3_500);
    expect(r.max).toBe(3_500);
  });

  it('valor 0 means piso dominates entirely', () => {
    const r = calculate('primeira', 0, 'simples');
    expect(r.min).toBe(3_500);
    expect(r.max).toBe(3_500);
    expect(r.pisoDomainsMax).toBe(true);
  });

  // ── Todas as fases não-criminais ──

  it('produces sensible results for every non-criminal phase', () => {
    const phases = ['consultoria', 'extrajudicial', 'primeira', 'segunda', 'superior', 'trabalhista', 'inventario'] as const;
    for (const fase of phases) {
      const f = FASES[fase];
      const r = calculate(fase, 500_000, 'simples');
      // min should be >= piso
      expect(r.min).toBeGreaterThanOrEqual(f.minFixed);
      // max should be >= min
      expect(r.max).toBeGreaterThanOrEqual(r.min);
      // not criminal
      expect(r.isCriminal).toBe(false);
    }
  });
});

// ─── calculate — casos criminais ───────────────────────────────────────────

describe('calculate — criminal cases', () => {
  it('returns fixed range for criminal', () => {
    const r = calculate('criminal', 0, 'simples');
    expect(r.isCriminal).toBe(true);
    expect(r.min).toBe(2_500);
    expect(r.max).toBe(25_000);
    expect(r.min).toBeLessThan(r.max);
  });

  it('returns fixed range for criminal júri', () => {
    const r = calculate('criminal_juri', 0, 'medio');
    expect(r.isCriminal).toBe(true);
    expect(r.min).toBe(4_000);
    expect(r.max).toBe(35_000);
  });

  it('suggested is within [min, max] for criminal', () => {
    for (const c of ['simples', 'medio', 'complexo'] as const) {
      const r = calculate('criminal', 0, c);
      expect(r.suggested).toBeGreaterThanOrEqual(r.min);
      expect(r.suggested).toBeLessThanOrEqual(r.max);
    }
  });

  it('higher complexity places suggested closer to max for criminal', () => {
    const s = calculate('criminal', 0, 'simples');
    const m = calculate('criminal', 0, 'medio');
    const c = calculate('criminal', 0, 'complexo');
    expect(m.suggested).toBeGreaterThan(s.suggested);
    expect(c.suggested).toBeGreaterThan(m.suggested);
  });

  it('ignores valor da causa for criminal cases', () => {
    const r1 = calculate('criminal', 0, 'medio');
    const r2 = calculate('criminal', 1_000_000, 'medio');
    expect(r1.min).toBe(r2.min);
    expect(r1.max).toBe(r2.max);
    expect(r1.suggested).toBe(r2.suggested);
  });
});

// ─── gerarProposta ─────────────────────────────────────────────────────────

describe('gerarProposta', () => {
  const baseResult = calculate('primeira', 100_000, 'simples');

  it('generates fixo proposal with min, max, and suggested', () => {
    const text = gerarProposta('primeira', 'fixo', baseResult, 100_000, 'simples', 20);
    expect(text).toContain('HONORÁRIOS FIXOS');
    expect(text).toContain('Honorários mínimos (OAB)');
    expect(text).toContain('Honorários máximos (OAB)');
    expect(text).toContain('Valor sugerido');
    expect(text).toContain('1ª Instância');
  });

  it('generates êxito proposal with percentage', () => {
    const text = gerarProposta('primeira', 'exito', baseResult, 100_000, 'simples', 25);
    expect(text).toContain('HONORÁRIOS DE ÊXITO');
    expect(text).toContain('25%');
  });

  it('generates misto proposal with fixo entry + êxito', () => {
    const text = gerarProposta('primeira', 'misto', baseResult, 100_000, 'simples', 20);
    expect(text).toContain('HONORÁRIOS MISTOS');
    expect(text).toContain('Honorário fixo (entrada)');
    expect(text).toContain('Honorário de êxito');
  });

  it('includes complexity label', () => {
    const text = gerarProposta('primeira', 'fixo', baseResult, 100_000, 'simples', 20);
    expect(text).toContain('Simples');
  });

  it('includes valor da causa when > 0', () => {
    const text = gerarProposta('primeira', 'fixo', baseResult, 100_000, 'simples', 20);
    expect(text).toContain('Valor da causa');
  });

  it('omits valor da causa when 0', () => {
    const crimResult = calculate('criminal', 0, 'simples');
    const text = gerarProposta('criminal', 'fixo', crimResult, 0, 'simples', 20);
    expect(text).not.toContain('Valor da causa');
  });
});
