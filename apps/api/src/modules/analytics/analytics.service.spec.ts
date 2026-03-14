import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService(null as any);
  });

  describe('buildPredictionPrompt', () => {
    it('contains area and tribunal in prompt', () => {
      const result = service.buildPredictionPrompt({
        area: 'trabalhista',
        pedido: 'horas extras',
        tribunal: 'TST',
      });
      expect(result).toContain('trabalhista');
      expect(result).toContain('TST');
    });

    it('contains pedido in prompt', () => {
      const result = service.buildPredictionPrompt({
        area: 'cível',
        pedido: 'indenização por dano moral',
        tribunal: 'TJSP',
      });
      expect(result).toContain('indenização por dano moral');
    });

    it('returns a non-empty string', () => {
      const result = service.buildPredictionPrompt({
        area: 'previdenciário',
        pedido: 'aposentadoria por invalidez',
        tribunal: 'TRF',
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);
    });
  });

  describe('parsePredictionResult', () => {
    it('parses JSON string and returns object with probabilidade', () => {
      const json = JSON.stringify({
        probabilidade: 75,
        prazoMedio: 18,
        fundamento: 'Jurisprudência consolidada',
      });
      const result = service.parsePredictionResult(json);
      expect(result.probabilidade).toBe(75);
    });

    it('parses prazoMedio correctly', () => {
      const json = JSON.stringify({
        probabilidade: 60,
        prazoMedio: 24,
        fundamento: 'Entendimento divergente',
      });
      const result = service.parsePredictionResult(json);
      expect(result.prazoMedio).toBe(24);
    });

    it('handles parsing errors gracefully', () => {
      const result = service.parsePredictionResult('invalid json');
      expect(result).toHaveProperty('probabilidade');
      expect(result).toHaveProperty('prazoMedio');
    });
  });
});
