import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { RagModule } from '../rag/rag.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [RagModule, MetricsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
