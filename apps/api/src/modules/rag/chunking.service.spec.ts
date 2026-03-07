import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChunkingService } from './chunking.service';

const mockConfigService = {
  get: (key: string, defaultVal?: any) => {
    const config: Record<string, any> = {
      'app.rag.chunkSize': 500,
      'app.rag.chunkOverlap': 100,
    };
    return config[key] ?? defaultVal;
  },
};

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChunkingService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ChunkingService>(ChunkingService);
  });

  describe('chunkText', () => {
    it('deve retornar array vazio para texto vazio', () => {
      expect(service.chunkText('')).toEqual([]);
      expect(service.chunkText('   ')).toEqual([]);
    });

    it('deve gerar ao menos um chunk para texto pequeno', () => {
      const text = 'Esta é uma jurisprudência sobre responsabilidade civil.';
      const chunks = service.chunkText(text);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('responsabilidade civil');
    });

    it('deve dividir texto longo em múltiplos chunks', () => {
      const paragraph = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
      const longText = Array(10).fill(paragraph).join('\n\n');

      const chunks = service.chunkText(longText);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('deve indexar chunks sequencialmente', () => {
      const text = Array(5)
        .fill('Parágrafo sobre matéria jurídica relevante. '.repeat(15))
        .join('\n\n');

      const chunks = service.chunkText(text);
      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i);
      });
    });

    it('deve incluir estimativa de tokens', () => {
      const text = 'Texto jurídico para teste de chunking com tokens. '.repeat(10);
      const chunks = service.chunkText(text);
      chunks.forEach((chunk) => {
        expect(chunk.tokenEstimate).toBeGreaterThan(0);
      });
    });
  });
});
