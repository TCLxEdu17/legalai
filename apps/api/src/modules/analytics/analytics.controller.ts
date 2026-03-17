import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { AnalyticsService, PredictionPromptParams } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
