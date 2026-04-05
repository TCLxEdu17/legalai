import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RadarsService } from './radars.service';
import { RadarEmailService } from './radar-email.service';
import { RadarsController } from './radars.controller';
import { RadarAlertsController } from './radar-alerts.controller';

@Module({
  imports: [PrismaModule, RagModule, NotificationsModule],
  providers: [RadarsService, RadarEmailService],
  controllers: [RadarsController, RadarAlertsController],
  exports: [RadarsService],
})
export class RadarsModule {}
