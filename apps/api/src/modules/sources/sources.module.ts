import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [PrismaModule],
  providers: [SourcesService],
  controllers: [SourcesController],
  exports: [SourcesService],
})
export class SourcesModule {}
