import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CollectorsModule } from '../collectors/collectors.module';
import { RagModule } from '../rag/rag.module';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, CollectorsModule, RagModule, NotificationsModule],
  providers: [IngestionService],
  controllers: [IngestionController],
  exports: [IngestionService],
})
export class IngestionModule {}
