import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    this.logger.log(`Login realizado: ${user.email} (${user.role})`);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Invalidar o token usado (rotação de tokens)
    await this.prisma.refreshToken.delete({ where: { token } });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );

    return {
      ...tokens,
      user: {
        id: stored.user.id,
        name: stored.user.name,
        email: stored.user.email,
        role: stored.user.role,
      },
    };
  }

  async logout(userId: string, token?: string): Promise<void> {
    if (token) {
      await this.prisma.refreshToken.deleteMany({
        where: { token },
      });
    } else {
      // Invalidar todos os refresh tokens do usuário
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
    this.logger.log(`Logout realizado para usuário: ${userId}`);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<Omit<AuthTokens, 'user'>> {
    const jwtConfig = this.configService.get('app.jwt');

    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expiresIn,
    });

    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 dias

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    // Limpar tokens expirados (housekeeping)
    await this.prisma.refreshToken
      .deleteMany({
        where: { userId, expiresAt: { lt: new Date() } },
      })
      .catch(() => {}); // Não bloquear se falhar

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutos em segundos
    };
  }
}
