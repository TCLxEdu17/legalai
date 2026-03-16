import { NotificacoesClientesService } from './notificacoes-clientes.service';

describe('NotificacoesClientesService', () => {
  let service: NotificacoesClientesService;

  beforeEach(() => {
    service = new NotificacoesClientesService();
  });

  describe('buildWhatsAppMessage', () => {
    it('contains client name and process number', () => {
      const result = service.buildWhatsAppMessage({
        clienteNome: 'João',
        numeroProcesso: '1234567-89.2023.8.26.0001',
        movimento: 'Despacho publicado',
      });
      expect(result).toContain('João');
      expect(result).toContain('1234567-89.2023.8.26.0001');
    });

    it('contains the movement description', () => {
      const result = service.buildWhatsAppMessage({
        clienteNome: 'Ana',
        numeroProcesso: '9999-01.2024.8.26.0100',
        movimento: 'Sentença prolatada',
      });
      expect(result).toContain('Sentença prolatada');
    });
  });

  describe('buildEmailBody', () => {
    it('contains client name and movement in HTML', () => {
      const result = service.buildEmailBody({
        clienteNome: 'Maria',
        numeroProcesso: '9876',
        movimento: 'Sentença',
      });
      expect(result).toContain('Maria');
      expect(result).toContain('Sentença');
    });

    it('returns an HTML string with basic structure', () => {
      const result = service.buildEmailBody({
        clienteNome: 'Carlos',
        numeroProcesso: '12345',
        movimento: 'Despacho',
      });
      // Should be an HTML string
      expect(result).toContain('<');
      expect(result).toContain('>');
    });
  });
});
