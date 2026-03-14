import { TarefasService } from './tarefas.service';

describe('TarefasService', () => {
  let service: TarefasService;

  beforeEach(() => {
    service = new TarefasService(null as any);
  });

  describe('createTarefa', () => {
    it('returns object with status PENDENTE', () => {
      const result = service.createTarefaLocal({
        titulo: 'Protocolar recurso',
        caseId: 'case1',
        prazo: '2024-03-15',
        prioridade: 'ALTA',
      });
      expect(result.status).toBe('PENDENTE');
    });

    it('includes titulo in result', () => {
      const result = service.createTarefaLocal({
        titulo: 'Protocolar recurso',
        caseId: 'case1',
        prazo: '2024-03-15',
        prioridade: 'ALTA',
      });
      expect(result.titulo).toBe('Protocolar recurso');
    });

    it('includes prioridade in result', () => {
      const result = service.createTarefaLocal({
        titulo: 'Enviar documentos',
        caseId: 'case2',
        prazo: '2024-04-01',
        prioridade: 'URGENTE',
      });
      expect(result.prioridade).toBe('URGENTE');
    });
  });

  describe('filterTarefasVencendo', () => {
    it('returns only overdue pending tarefas', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tarefas = [
        { prazo: yesterday, status: 'PENDENTE', titulo: 'Atrasada' },
        { prazo: tomorrow, status: 'PENDENTE', titulo: 'Futura' },
      ] as any[];

      const result = service.filterTarefasVencendo(tarefas);
      expect(result).toHaveLength(1);
      expect(result[0].titulo).toBe('Atrasada');
    });

    it('excludes completed tarefas even if overdue', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tarefas = [
        { prazo: yesterday, status: 'PENDENTE', titulo: 'Atrasada pendente' },
        { prazo: yesterday, status: 'CONCLUIDA', titulo: 'Concluída' },
      ] as any[];

      const result = service.filterTarefasVencendo(tarefas);
      expect(result).toHaveLength(1);
      expect(result[0].titulo).toBe('Atrasada pendente');
    });

    it('returns empty array when no overdue tarefas', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tarefas = [
        { prazo: tomorrow, status: 'PENDENTE', titulo: 'Futura' },
      ] as any[];

      const result = service.filterTarefasVencendo(tarefas);
      expect(result).toHaveLength(0);
    });
  });
});
