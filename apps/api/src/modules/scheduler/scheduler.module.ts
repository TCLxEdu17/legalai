import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, IngestionModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
