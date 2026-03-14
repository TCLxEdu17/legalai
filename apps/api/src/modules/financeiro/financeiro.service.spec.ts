import { FinanceiroService } from './financeiro.service';

describe('FinanceiroService', () => {
  let service: FinanceiroService;

  beforeEach(() => {
    service = new FinanceiroService(null as any);
  });

  describe('calcularFluxoCaixa', () => {
    it('calculates entradas, saidas, saldo correctly', () => {
      const result = service.calcularFluxoCaixa([
        { tipo: 'entrada', valor: 5000 },
        { tipo: 'saida', valor: 2000 },
      ]);
      expect(result.entradas).toBe(5000);
      expect(result.saidas).toBe(2000);
      expect(result.saldo).toBe(3000);
    });

    it('returns zeros for empty array', () => {
      const result = service.calcularFluxoCaixa([]);
      expect(result.entradas).toBe(0);
      expect(result.saidas).toBe(0);
      expect(result.saldo).toBe(0);
    });

    it('handles multiple entries of same type', () => {
      const result = service.calcularFluxoCaixa([
        { tipo: 'entrada', valor: 1000 },
        { tipo: 'entrada', valor: 2000 },
        { tipo: 'saida', valor: 500 },
      ]);
      expect(result.entradas).toBe(3000);
      expect(result.saidas).toBe(500);
      expect(result.saldo).toBe(2500);
    });
  });

  describe('lancarCobranca', () => {
    it('returns object with status pendente', () => {
      const result = service.lancarCobranca({
        clienteId: '1',
        valor: 3000,
        vencimento: '2024-03-01',
        descricao: 'Honorários',
      });
      expect(result.status).toBe('pendente');
    });

    it('includes the provided values in the result', () => {
      const result = service.lancarCobranca({
        clienteId: 'client-123',
        valor: 1500,
        vencimento: '2024-06-15',
        descricao: 'Consulta jurídica',
      });
      expect(result.valor).toBe(1500);
      expect(result.descricao).toBe('Consulta jurídica');
      expect(result.clienteId).toBe('client-123');
    });
  });
});
