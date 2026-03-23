import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RadarsService } from './radars.service';

@Module({
  imports: [PrismaModule, RagModule, NotificationsModule],
  providers: [RadarsService],
  controllers: [],
  exports: [RadarsService],
})
export class RadarsModule {}
