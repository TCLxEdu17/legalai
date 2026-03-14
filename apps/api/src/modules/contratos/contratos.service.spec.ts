import { ContratosService } from './contratos.service';

describe('ContratosService', () => {
  let service: ContratosService;

  beforeEach(() => {
    service = new ContratosService();
  });

  describe('generateContrato', () => {
    it('generates fixo contract with formatted value and client name', () => {
      const result = service.generateContrato({
        tipo: 'fixo',
        valor: 5000,
        clienteNome: 'João Silva',
        advogadoNome: 'Dr. X',
        objeto: 'Ação trabalhista',
      });
      expect(result).toContain('R$ 5.000,00');
      expect(result).toContain('João Silva');
    });

    it('generates exito contract with percentage', () => {
      const result = service.generateContrato({
        tipo: 'exito',
        percentual: 20,
        estimativa: 100000,
        clienteNome: 'Maria Souza',
        advogadoNome: 'Dr. Y',
        objeto: 'Ação cível',
      });
      expect(result).toContain('20%');
    });

    it('generates misto contract with both fields', () => {
      const result = service.generateContrato({
        tipo: 'misto',
        valor: 3000,
        percentual: 15,
        clienteNome: 'Empresa ABC',
        advogadoNome: 'Dr. Z',
        objeto: 'Consultoria',
      });
      expect(result).toContain('R$ 3.000,00');
      expect(result).toContain('15%');
    });

    it('includes advogado name in the contract', () => {
      const result = service.generateContrato({
        tipo: 'fixo',
        valor: 2000,
        clienteNome: 'Pedro Alves',
        advogadoNome: 'Dra. Ana Lima',
        objeto: 'Divórcio',
      });
      expect(result).toContain('Dra. Ana Lima');
    });

    it('includes objeto in the contract', () => {
      const result = service.generateContrato({
        tipo: 'fixo',
        valor: 1500,
        clienteNome: 'Carlos Neto',
        advogadoNome: 'Dr. M',
        objeto: 'Revisão contratual bancária',
      });
      expect(result).toContain('Revisão contratual bancária');
    });
  });
});
