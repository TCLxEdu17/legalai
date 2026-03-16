import { Module } from '@nestjs/common';
import { NotificacoesClientesService } from './notificacoes-clientes.service';

@Module({
  providers: [NotificacoesClientesService],
  exports: [NotificacoesClientesService],
})
export class NotificacoesClientesModule {}
