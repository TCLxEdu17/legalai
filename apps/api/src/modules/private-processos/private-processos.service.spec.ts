import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrivateProcessosService } from './private-processos.service';
import { OabCredentialsService } from './oab-credentials.service';
import { EsajTjspConnector, ProcessDetails, EsajSession } from './connectors/esaj-tjsp.connector';
import { PrismaService } from '../../prisma/prisma.service';

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_OAB = '123456/SP';
const MOCK_PROCESS_NUMBER = '4000091-84.2025.8.26.0280';

const MOCK_PROCESS_DETAILS: ProcessDetails = {
  number: MOCK_PROCESS_NUMBER,
  classe: 'Procedimento Comum Cível',
  assunto: 'Indenização por Dano Moral',
  juiz: 'DR. JOÃO DA SILVA',
  situacao: 'Em andamento',
  movimentacoes: [
    { data: '15/03/2025', descricao: 'Petição juntada aos autos.' },
    { data: '10/03/2025', descricao: 'Despacho. Cite-se.' },
  ],
};

const MOCK_SESSION: EsajSession = {
  cookie: 'JSESSIONID=abc123',
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
};

const mockOabCredentialsService = {
  hasCredentials: jest.fn(),
  getDecryptedCredentials: jest.fn(),
  saveCredentials: jest.fn(),
  deleteCredentials: jest.fn(),
};

const mockEsajConnector = {
  login: jest.fn(),
  queryProcess: jest.fn(),
  parseCnjNumber: jest.fn(),
};

const mockPrisma = {
  savedProcess: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

describe('PrivateProcessosService', () => {
  let service: PrivateProcessosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivateProcessosService,
        { provide: OabCredentialsService, useValue: mockOabCredentialsService },
        { provide: EsajTjspConnector, useValue: mockEsajConnector },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PrivateProcessosService>(PrivateProcessosService);
    jest.clearAllMocks();
  });

  describe('queryPrivateProcess', () => {
    it('deve consultar processo privado com sucesso', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'pro' });
      mockOabCredentialsService.hasCredentials.mockResolvedValue(true);
      mockOabCredentialsService.getDecryptedCredentials.mockResolvedValue({
        oabNumber: MOCK_OAB,
        password: 'SenhaOAB@123',
      });
      mockEsajConnector.login.mockResolvedValue(MOCK_SESSION);
      mockEsajConnector.queryProcess.mockResolvedValue(MOCK_PROCESS_DETAILS);

      const result = await service.queryPrivateProcess(MOCK_USER_ID, MOCK_PROCESS_NUMBER);

      expect(result).toEqual(MOCK_PROCESS_DETAILS);
      expect(mockEsajConnector.login).toHaveBeenCalledWith(MOCK_OAB, 'SenhaOAB@123');
      expect(mockEsajConnector.queryProcess).toHaveBeenCalledWith(MOCK_PROCESS_NUMBER, MOCK_SESSION);
    });

    it('deve lançar ForbiddenException para usuários sem plano PRO', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'trial' });

      await expect(
        service.queryPrivateProcess(MOCK_USER_ID, MOCK_PROCESS_NUMBER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFoundException quando não há credenciais OAB salvas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'pro' });
      mockOabCredentialsService.hasCredentials.mockResolvedValue(false);

      await expect(
        service.queryPrivateProcess(MOCK_USER_ID, MOCK_PROCESS_NUMBER),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando login OAB falha', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'pro' });
      mockOabCredentialsService.hasCredentials.mockResolvedValue(true);
      mockOabCredentialsService.getDecryptedCredentials.mockResolvedValue({
        oabNumber: MOCK_OAB,
        password: 'SenhaErrada',
      });
      mockEsajConnector.login.mockRejectedValue(new Error('Credenciais inválidas'));

      await expect(
        service.queryPrivateProcess(MOCK_USER_ID, MOCK_PROCESS_NUMBER),
      ).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('savePrivateProcess', () => {
    it('deve salvar processo para monitoramento', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'pro' });
      mockPrisma.savedProcess.upsert.mockResolvedValue({ id: 'sp-uuid-1', number: MOCK_PROCESS_NUMBER });

      const result = await service.savePrivateProcess(MOCK_USER_ID, MOCK_PROCESS_NUMBER, 'Meu Processo');

      expect(mockPrisma.savedProcess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_number: { userId: MOCK_USER_ID, number: MOCK_PROCESS_NUMBER } },
        }),
      );
      expect(result.number).toBe(MOCK_PROCESS_NUMBER);
    });

    it('deve lançar ForbiddenException para planos sem acesso PRO', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'basic' });

      await expect(
        service.savePrivateProcess(MOCK_USER_ID, MOCK_PROCESS_NUMBER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listSavedPrivateProcesses', () => {
    it('deve listar processos salvos do usuário', async () => {
      mockPrisma.savedProcess.findMany.mockResolvedValue([
        { id: 'sp-1', number: MOCK_PROCESS_NUMBER, title: 'Meu Processo', checkEnabled: true },
      ]);

      const result = await service.listSavedPrivateProcesses(MOCK_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(MOCK_PROCESS_NUMBER);
      expect(mockPrisma.savedProcess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: MOCK_USER_ID } }),
      );
    });
  });

  describe('isPro', () => {
    it('deve retornar true para plano pro', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'pro' });
      const result = await service.isPro(MOCK_USER_ID);
      expect(result).toBe(true);
    });

    it('deve retornar false para plano trial', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'trial' });
      const result = await service.isPro(MOCK_USER_ID);
      expect(result).toBe(false);
    });

    it('deve retornar false para plano basic', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: 'basic' });
      const result = await service.isPro(MOCK_USER_ID);
      expect(result).toBe(false);
    });
  });
});
