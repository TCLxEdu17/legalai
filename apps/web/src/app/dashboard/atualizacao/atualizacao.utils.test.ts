import { describe, it, expect } from 'vitest';
import {
  corrigirPeloIPCA,
  calcularJurosMoratorios,
  calcularTabelaTJSP,
  formatCurrency,
} from './atualizacao.utils';

describe('corrigirPeloIPCA', () => {
  it('returns a number > original value for full year 2023', () => {
    const result = corrigirPeloIPCA(1000, '2023-01-01', '2024-01-01');
    expect(result).toBeGreaterThan(1000);
  });

  it('returns same value when start and end are equal', () => {
    const result = corrigirPeloIPCA(1000, '2023-06-01', '2023-06-01');
    expect(result).toBe(1000);
  });
});

describe('calcularJurosMoratorios', () => {
  it('calculates compound interest for 12 months at 1% per month', () => {
    const result = calcularJurosMoratorios(1000, 12);
    // (1 + 0.01)^12 = 1.126825... → 1126.83
    expect(result).toBeCloseTo(1126.83, 1);
  });

  it('returns original value for 0 months', () => {
    const result = calcularJurosMoratorios(1000, 0);
    expect(result).toBe(1000);
  });

  it('accepts custom monthly rate', () => {
    const result = calcularJurosMoratorios(1000, 1, 0.02);
    expect(result).toBeCloseTo(1020, 1);
  });
});

describe('calcularTabelaTJSP', () => {
  it('returns object with principal, correcao, juros, total', () => {
    const result = calcularTabelaTJSP(1000, '2022-01-01', '2023-01-01');
    expect(result).toHaveProperty('principal');
    expect(result).toHaveProperty('correcao');
    expect(result).toHaveProperty('juros');
    expect(result).toHaveProperty('total');
  });

  it('total is greater than principal', () => {
    const result = calcularTabelaTJSP(1000, '2022-01-01', '2023-01-01');
    expect(result.total).toBeGreaterThan(result.principal);
  });

  it('principal matches input', () => {
    const result = calcularTabelaTJSP(1000, '2022-01-01', '2023-01-01');
    expect(result.principal).toBe(1000);
  });
});

describe('formatCurrency', () => {
  it('formats number as pt-BR currency with R$ prefix', () => {
    const result = formatCurrency(1234.5);
    expect(result).toBe('R$ 1.234,50');
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toBe('R$ 0,00');
  });

  it('formats large numbers correctly', () => {
    const result = formatCurrency(1000000);
    expect(result).toBe('R$ 1.000.000,00');
  });
});
