import { Module } from '@nestjs/common';
import { PeticoesService } from './peticoes.service';
import { PeticoesController } from './peticoes.controller';

@Module({
  controllers: [PeticoesController],
  providers: [PeticoesService],
  exports: [PeticoesService],
})
export class PeticoesModule {}
