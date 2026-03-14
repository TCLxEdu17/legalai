import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { WinstonModule } from 'nest-winston';
import appConfig from './config/app.config';
import { winstonConfig } from './config/logger.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { SourcesModule } from './modules/sources/sources.module';
import { CollectorsModule } from './modules/collectors/collectors.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { TrialModule } from './modules/trial/trial.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { StorageModule } from './modules/storage/storage.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HearingsModule } from './modules/hearings/hearings.module';
import { ClientsModule } from './modules/clients/clients.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommentsModule } from './modules/comments/comments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ProcessosModule } from './modules/processos/processos.module';
import { CasesModule } from './modules/cases/cases.module';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Logger global
    WinstonModule.forRoot(winstonConfig),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 20,
      },
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Infraestrutura
    PrismaModule,
    StorageModule,

    // Módulos de negócio
    AuthModule,
    UsersModule,
    DocumentsModule,
    UploadsModule,
    RagModule,
    ChatModule,

    // Ingestão automática
    CollectorsModule,
    SourcesModule,
    IngestionModule,
    SchedulerModule,

    // API Keys
    ApiKeysModule,

    // Trial & Metrics
    TrialModule,
    MetricsModule,

    // Favoritos
    FavoritesModule,

    // Audiências
    HearingsModule,

    // Clientes
    ClientsModule,

    // Notificações
    NotificationsModule,

    // Comentários
    CommentsModule,

    // Webhooks
    WebhooksModule,

    // Consulta Processual (DataJud/CNJ)
    ProcessosModule,

    // Casos jurídicos (copiloto por processo)
    CasesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
