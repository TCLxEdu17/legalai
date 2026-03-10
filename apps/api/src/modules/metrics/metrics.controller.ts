import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get API usage summary' })
  getUsageSummary(@CurrentUser() user: any) {
    this.logger.log(`GET /metrics/usage — userId=${user?.id} role=${user?.role}`);
    return this.metricsService.getUsageSummary(user.id, user.role);
  }
}
