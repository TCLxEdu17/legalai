import { Module } from '@nestjs/common';
import { PeticoesService } from './peticoes.service';
import { PeticoesController } from './peticoes.controller';

@Module({
  controllers: [PeticoesController],
  providers: [
    PeticoesService,
    { provide: 'CASES_SERVICE', useValue: null },
  ],
  exports: [PeticoesService],
})
export class PeticoesModule {}
