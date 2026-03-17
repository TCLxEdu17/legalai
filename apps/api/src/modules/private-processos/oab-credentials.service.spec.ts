import { Test, TestingModule } from '@nestjs/testing';
import { OabCredentialsService } from './oab-credentials.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_OAB = '123456/SP';
const MOCK_PASSWORD = 'SenhaOAB@123';

const mockPrisma = {
  oabCredential: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockConfig = {
  get: (key: string, def?: string) => {
    if (key === 'OAB_ENCRYPTION_KEY') return 'a'.repeat(64); // 32 bytes hex
    return def;
  },
};

describe('OabCredentialsService', () => {
  let service: OabCredentialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OabCredentialsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<OabCredentialsService>(OabCredentialsService);
    jest.clearAllMocks();
  });

  describe('saveCredentials', () => {
    it('deve criptografar a senha e salvar no banco', async () => {
      mockPrisma.oabCredential.upsert.mockResolvedValue({ id: 'cred-uuid-1' });

      await service.saveCredentials(MOCK_USER_ID, MOCK_OAB, MOCK_PASSWORD);

      expect(mockPrisma.oabCredential.upsert).toHaveBeenCalledTimes(1);

      const call = mockPrisma.oabCredential.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ userId: MOCK_USER_ID });
      expect(call.create.oabNumber).toBe(MOCK_OAB);
      // Senha não deve ser armazenada em texto claro
      expect(call.create.encryptedPwd).toBeDefined();
      expect(call.create.encryptedPwd).not.toBe(MOCK_PASSWORD);
      expect(call.create.iv).toBeDefined();
      expect(call.create.authTag).toBeDefined();
    });

    it('deve sobrescrever credenciais existentes (upsert)', async () => {
      mockPrisma.oabCredential.upsert.mockResolvedValue({ id: 'cred-uuid-1' });

      await service.saveCredentials(MOCK_USER_ID, MOCK_OAB, 'NovaSenha@456');
      await service.saveCredentials(MOCK_USER_ID, MOCK_OAB, 'NovaSenha@789');

      expect(mockPrisma.oabCredential.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDecryptedCredentials', () => {
    it('deve retornar null quando não há credenciais salvas', async () => {
      mockPrisma.oabCredential.findUnique.mockResolvedValue(null);

      const result = await service.getDecryptedCredentials(MOCK_USER_ID);

      expect(result).toBeNull();
    });

    it('deve descriptografar e retornar a senha correta', async () => {
      // Salva para obter dados cifrados reais
      mockPrisma.oabCredential.upsert.mockResolvedValue({});
      await service.saveCredentials(MOCK_USER_ID, MOCK_OAB, MOCK_PASSWORD);

      // Captura o que foi salvo no banco
      const savedData = mockPrisma.oabCredential.upsert.mock.calls[0][0].create;

      mockPrisma.oabCredential.findUnique.mockResolvedValue({
        oabNumber: MOCK_OAB,
        encryptedPwd: savedData.encryptedPwd,
        iv: savedData.iv,
        authTag: savedData.authTag,
      });

      const result = await service.getDecryptedCredentials(MOCK_USER_ID);

      expect(result).not.toBeNull();
      expect(result!.oabNumber).toBe(MOCK_OAB);
      expect(result!.password).toBe(MOCK_PASSWORD);
    });

    it('deve lançar erro se os dados cifrados forem corrompidos', async () => {
      mockPrisma.oabCredential.findUnique.mockResolvedValue({
        oabNumber: MOCK_OAB,
        encryptedPwd: 'dados-corrompidos',
        iv: 'iv-invalido',
        authTag: 'tag-invalida',
      });

      await expect(service.getDecryptedCredentials(MOCK_USER_ID)).rejects.toThrow();
    });
  });

  describe('deleteCredentials', () => {
    it('deve remover as credenciais do banco', async () => {
      mockPrisma.oabCredential.delete.mockResolvedValue({ id: 'cred-uuid-1' });

      await service.deleteCredentials(MOCK_USER_ID);

      expect(mockPrisma.oabCredential.delete).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID },
      });
    });

    it('deve lançar erro se não existir credencial para deletar', async () => {
      mockPrisma.oabCredential.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.deleteCredentials(MOCK_USER_ID)).rejects.toThrow('Record not found');
    });
  });

  describe('hasCredentials', () => {
    it('deve retornar true quando existem credenciais', async () => {
      mockPrisma.oabCredential.findUnique.mockResolvedValue({ id: 'cred-uuid-1' });

      const result = await service.hasCredentials(MOCK_USER_ID);

      expect(result).toBe(true);
    });

    it('deve retornar false quando não existem credenciais', async () => {
      mockPrisma.oabCredential.findUnique.mockResolvedValue(null);

      const result = await service.hasCredentials(MOCK_USER_ID);

      expect(result).toBe(false);
    });
  });
});
