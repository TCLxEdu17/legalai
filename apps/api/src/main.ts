import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { winstonConfig } from './config/logger.config';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
    rawBody: true,
  });

  // ─── Ensure critical columns exist on trial_users (fallback if migration didn't run) ───
  const prisma = app.get(PrismaService);
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "trial_users"
        ADD COLUMN IF NOT EXISTS "contact_email" TEXT,
        ADD COLUMN IF NOT EXISTS "phone" TEXT;
    `);
    console.log('✅ Colunas contact_email/phone confirmadas em trial_users');
  } catch (err: any) {
    console.warn(`⚠️  Falha ao verificar colunas trial_users: ${err.message} (ignorando)`);
  }

  const configService = app.get(ConfigService);
  const port = parseInt(process.env.PORT || '0') || configService.get<number>('app.port', 3001);
  const corsOrigins = configService.get<string>('app.corsOrigins', 'http://localhost:3000');

  // JWT secret validation — FAIL startup if secret is weak in production
  const jwtSecret = configService.get<string>('app.jwt.secret') ?? process.env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    const isProd = configService.get<string>('app.nodeEnv') === 'production';
    const msg = `⛔ JWT_SECRET is too short (< 32 chars) — tokens can be forged! Use a cryptographically secure secret of at least 32 characters.`;
    if (isProd) {
      console.error(msg);
      process.exit(1); // Fail in production
    } else {
      console.warn(`⚠️  ${msg} (Warning only in development)`);
    }
  }

  // Segurança HTTP
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite uploads/assets cross-origin
  }));

  // CORS
  const allowedOrigins = corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  console.log(`CORS origens permitidas: ${JSON.stringify(allowedOrigins)}`);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Prefixo global da API e versionamento
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Pipes globais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtros e interceptors globais
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger/OpenAPI — disponível em todos os ambientes (proteger via gateway/firewall em produção)
  {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Assistente Jurídico IA — API')
      .setDescription(
        'API REST do assistente jurídico com IA. Suporta autenticação JWT e API Keys para integração externa.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Autenticação e autorização')
      .addTag('users', 'Gestão de usuários')
      .addTag('documents', 'Jurisprudências e documentos')
      .addTag('uploads', 'Upload e processamento de arquivos')
      .addTag('chat', 'Assistente jurídico com IA')
      .addTag('rag', 'Pipeline RAG e embeddings')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`Swagger disponível em: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`API rodando em: http://localhost:${port}/api/v1`);
}

bootstrap();
