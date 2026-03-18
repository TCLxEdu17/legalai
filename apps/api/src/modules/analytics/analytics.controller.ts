import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { AnalyticsService, PredictionPromptParams } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('predicao')
  @HttpCode(HttpStatus.OK)
  async getPrediction(@Body() dto: PredictionPromptParams) {
    return this.analyticsService.getPrediction(dto);
  }

  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackEvent(
    @Request() req: any,
    @Body() dto: { event: string; page?: string; element?: string; metadata?: Record<string, unknown> },
  ) {
    await this.analyticsService.trackEvent(req.user.id, dto);
  }

  @Get('metrics/users')
  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  async getUserEngagement() {
    return this.analyticsService.getUserEngagementMetrics();
  }
}
