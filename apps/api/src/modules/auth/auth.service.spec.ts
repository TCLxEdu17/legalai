import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

const mockUser = {
  id: 'user-uuid-1',
  name: 'Admin Teste',
  email: 'admin@test.com',
  passwordHash: '',
  role: 'ADMIN',
  isActive: true,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mocked-jwt-token'),
};

const mockConfig = {
  get: (key: string, def?: any) => {
    const map: Record<string, any> = {
      'app.jwt.secret': 'test-secret',
      'app.jwt.expiresIn': '15m',
    };
    return map[key] ?? def;
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('SenhaCorreta@123');
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.login({
        email: 'admin@test.com',
        password: 'SenhaCorreta@123',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.user.role).toBe('ADMIN');
    });

    it('deve lançar UnauthorizedException para senha incorreta', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'admin@test.com', password: 'SenhaErrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException para usuário inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inexistente@test.com', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException para usuário inativo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'admin@test.com', password: 'SenhaCorreta@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
