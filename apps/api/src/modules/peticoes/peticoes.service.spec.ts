import { PeticoesService } from './peticoes.service';

describe('PeticoesService', () => {
  let service: PeticoesService;

  beforeEach(() => {
    service = new PeticoesService(null as any);
  });

  describe('getChecklistPeticao', () => {
    it('returns array with at least 5 items for recurso_apelacao', () => {
      const result = service.getChecklistPeticao('recurso_apelacao');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('includes Razões de apelação in recurso_apelacao checklist', () => {
      const result = service.getChecklistPeticao('recurso_apelacao');
      const hasRazoes = result.some((item) =>
        item.toLowerCase().includes('razões de apelação') ||
        item.toLowerCase().includes('razoes de apelacao') ||
        item.toLowerCase().includes('razões'),
      );
      expect(hasRazoes).toBe(true);
    });

    it('returns checklist for contestacao', () => {
      const result = service.getChecklistPeticao('contestacao');
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('returns default checklist for unknown type', () => {
      const result = service.getChecklistPeticao('unknown_type');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('buildPeticaoContext', () => {
    it('returns object with tipo, instrucoes, checklist', () => {
      const result = service.buildPeticaoContext({
        tipo: 'contestacao',
        caso: { titulo: 'Ação trabalhista', area: 'trabalhista' },
      });
      expect(result).toHaveProperty('tipo');
      expect(result).toHaveProperty('instrucoes');
      expect(result).toHaveProperty('checklist');
    });

    it('tipo matches input', () => {
      const result = service.buildPeticaoContext({
        tipo: 'contestacao',
        caso: { titulo: 'Ação cível', area: 'cível' },
      });
      expect(result.tipo).toBe('contestacao');
    });

    it('checklist is an array', () => {
      const result = service.buildPeticaoContext({
        tipo: 'recurso_apelacao',
        caso: { titulo: 'Ação trabalhista', area: 'trabalhista' },
      });
      expect(Array.isArray(result.checklist)).toBe(true);
    });

    it('instrucoes is a non-empty string', () => {
      const result = service.buildPeticaoContext({
        tipo: 'peticao_inicial',
        caso: { titulo: 'Ação de indenização', area: 'cível' },
      });
      expect(typeof result.instrucoes).toBe('string');
      expect(result.instrucoes.length).toBeGreaterThan(0);
    });
  });
});
