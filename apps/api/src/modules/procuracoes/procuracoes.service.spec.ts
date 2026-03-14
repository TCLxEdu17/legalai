import { ProcuracoesService } from './procuracoes.service';

describe('ProcuracoesService', () => {
  let service: ProcuracoesService;

  beforeEach(() => {
    service = new ProcuracoesService();
  });

  describe('generateProcuracao', () => {
    it('contains outorgante name and OAB number', () => {
      const result = service.generateProcuracao({
        outorgante: 'João Silva',
        cpf: '123.456.789-00',
        advogado: 'Dr. X',
        oab: 'SP 12345',
        poderes: 'amplos',
      });
      expect(result).toContain('João Silva');
      expect(result).toContain('SP 12345');
    });

    it('contains processo number for especiais type', () => {
      const result = service.generateProcuracao({
        outorgante: 'Maria Souza',
        cpf: '987.654.321-00',
        advogado: 'Dr. Y',
        oab: 'RJ 99999',
        poderes: 'especiais',
        processoNumero: '1234-56',
      });
      expect(result).toContain('1234-56');
      expect(result).toContain('especiais');
    });

    it('contains CPF of outorgante', () => {
      const result = service.generateProcuracao({
        outorgante: 'Carlos Neto',
        cpf: '111.222.333-44',
        advogado: 'Dr. Z',
        oab: 'SP 54321',
        poderes: 'amplos',
      });
      expect(result).toContain('111.222.333-44');
    });

    it('contains advogado name', () => {
      const result = service.generateProcuracao({
        outorgante: 'Pedro Lima',
        cpf: '555.666.777-88',
        advogado: 'Dra. Ana Costa',
        oab: 'MG 11111',
        poderes: 'amplos',
      });
      expect(result).toContain('Dra. Ana Costa');
    });
  });

  describe('enviarAssinatura', () => {
    it('returns simulado status when no integration configured', async () => {
      const result = await service.enviarAssinatura({
        email: 'cliente@test.com',
        conteudo: 'procuracao text',
      });
      expect(result.status).toBe('simulado');
    });
  });
});
