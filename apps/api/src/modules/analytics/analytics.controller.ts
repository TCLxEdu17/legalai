import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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
}
