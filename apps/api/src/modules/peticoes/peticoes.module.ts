import { Module } from '@nestjs/common';
import { PeticoesService } from './peticoes.service';
import { PeticoesController } from './peticoes.controller';

@Module({
  controllers: [PeticoesController],
  providers: [
    PeticoesService,
    // TypeScript emite design:paramtypes=[Object] para rest/any params.
    // Este provider satisfaz o token que o NestJS DI procura.
    { provide: Object, useValue: null },
  ],
  exports: [PeticoesService],
})
export class PeticoesModule {}
