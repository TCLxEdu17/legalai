import {
  Controller, Get, Post, Patch, Param, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RadarsService } from './radars.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class RadarAlertsController {
  constructor(private readonly radarsService: RadarsService) {}

  // Separate path from GET /radars/:id to avoid NestJS route conflict
  @Get('radar-alerts/unread-count')
  getUnreadCount(@Request() req: any) {
    return this.radarsService.getUnreadCount(req.user.id).then((count) => ({ count }));
  }

  @Get('radars/:id/alerts')
  listAlerts(@Param('id') id: string, @Request() req: any) {
    return this.radarsService.listAlerts(id, req.user.id);
  }

  @Patch('radars/:id/alerts/:alertId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(
    @Param('id') id: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.radarsService.markAlertRead(id, alertId, req.user.id);
  }

  @Post('radars/:id/alerts/:alertId/analyze')
  analyze(
    @Param('id') id: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.radarsService.generateImpactAnalysis(id, alertId, req.user.id)
      .then((impactAnalysis) => ({ impactAnalysis }));
  }
}
