import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RagModule } from '../rag/rag.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [RagModule, PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
