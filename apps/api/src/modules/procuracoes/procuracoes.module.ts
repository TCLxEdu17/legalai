import { Module } from '@nestjs/common';
import { ProcuracoesService } from './procuracoes.service';
import { ProcuracoesController } from './procuracoes.controller';

@Module({
  controllers: [ProcuracoesController],
  providers: [ProcuracoesService],
  exports: [ProcuracoesService],
})
export class ProcuracoesModule {}
