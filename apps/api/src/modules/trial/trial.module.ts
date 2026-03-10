import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrialService } from './trial.service';
import { TrialController } from './trial.controller';

@Module({
  imports: [PrismaModule],
  providers: [TrialService],
  controllers: [TrialController],
  exports: [TrialService],
})
export class TrialModule {}
