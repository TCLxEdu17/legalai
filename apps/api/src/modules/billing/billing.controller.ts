import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BillingService } from './billing.service';
import { RawBodyRequest } from '@nestjs/common';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Criar sessão de checkout Stripe' })
  async createCheckout(
    @CurrentUser('id') userId: string,
    @Body() body: { planId: string },
  ) {
    return this.billingService.createCheckoutSession(userId, body.planId);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar sessão do portal Stripe' })
  async createPortal(@CurrentUser('id') userId: string) {
    return this.billingService.createPortalSession(userId);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Stripe (público)' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      this.logger.error('Webhook received without raw body — check rawBody middleware configuration');
      throw new BadRequestException('Raw body not available');
    }
    await this.billingService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
