import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TrialService } from './trial.service';
import { CreateTrialDto } from './dto/create-trial.dto';
import { FeedbackTrialDto } from './dto/feedback-trial.dto';

@ApiTags('Trial')
@Controller('trial')
export class TrialController {
  private readonly logger = new Logger(TrialController.name);

  constructor(private readonly trialService: TrialService) {}

  @Post()
  @ApiOperation({ summary: 'Create a trial user (public)' })
  create(@Body() dto: CreateTrialDto) {
    this.logger.log(`POST /trial — prefix=${dto.prefix} name=${dto.name}`);
    return this.trialService.create(dto);
  }

  // admin/metrics MUST be defined BEFORE :id to avoid route conflict
  @Get('admin/metrics')
  @ApiOperation({ summary: 'Get admin metrics for all trial users (ADMIN only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as any)
  getAdminMetrics() {
    this.logger.log('GET /trial/admin/metrics');
    return this.trialService.getAdminMetrics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trial user status (public)' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`GET /trial/${id}`);
    return this.trialService.findById(id);
  }

  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend trial by N hours (admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as any)
  extendTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { hours?: number },
  ) {
    this.logger.log(`POST /trial/${id}/extend — hours=${body.hours ?? 24}`);
    return this.trialService.extendTrial(id, body.hours ?? 24);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert trial to paid account (admin only), preserves all data' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as any)
  convertTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email: string },
  ) {
    this.logger.log(`POST /trial/${id}/convert — email=${body.email}`);
    return this.trialService.convertTrial(id, body.email);
  }

  @Post(':id/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit feedback for trial user (public)' })
  submitFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FeedbackTrialDto,
  ) {
    this.logger.log(`POST /trial/${id}/feedback — feedback=${dto.feedback}`);
    return this.trialService.submitFeedback(id, dto);
  }

  @Post(':id/track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track a metric event for a trial user (public)' })
  trackMetric(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      event: string;
      page?: string;
      element?: string;
      metadata?: any;
    },
    @Req() req: any,
  ) {
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    this.logger.log(`POST /trial/${id}/track — event=${body.event} page=${body.page}`);
    return this.trialService.trackMetric(id, body.event, {
      page: body.page,
      element: body.element,
      ipAddress,
      userAgent,
      metadata: body.metadata,
    });
  }
}
