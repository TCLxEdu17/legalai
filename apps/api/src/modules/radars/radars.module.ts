import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, RagModule, NotificationsModule],
  providers: [],
  controllers: [],
  exports: [],
})
export class RadarsModule {}
