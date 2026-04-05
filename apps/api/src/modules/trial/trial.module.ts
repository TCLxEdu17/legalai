import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrialService } from './trial.service';
import { TrialController } from './trial.controller';
import { OwnerNotifyService } from './owner-notify.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [TrialService, OwnerNotifyService],
  controllers: [TrialController],
  exports: [TrialService],
})
export class TrialModule {}
