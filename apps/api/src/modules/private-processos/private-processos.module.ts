import { Module } from '@nestjs/common';
import { PrivateProcessosController } from './private-processos.controller';
import { PrivateProcessosService } from './private-processos.service';
import { OabCredentialsService } from './oab-credentials.service';
import { EsajTjspConnector } from './connectors/esaj-tjsp.connector';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrivateProcessosController],
  providers: [PrivateProcessosService, OabCredentialsService, EsajTjspConnector],
  exports: [PrivateProcessosService, OabCredentialsService],
})
export class PrivateProcessosModule {}
