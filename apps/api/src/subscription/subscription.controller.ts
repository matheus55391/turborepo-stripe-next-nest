import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { SafeUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreatePortalDto } from './dto/create-portal.dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiOperation({ summary: 'List available plans' })
  @ApiOkResponse({ description: 'Returns available plans' })
  @Get('plans')
  getPlans() {
    return { plans: this.subscriptionService.getPlans() };
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current plan and subscription' })
  @ApiOkResponse({ description: 'Returns current plan details' })
  @Get()
  async getSubscription(@Req() req: Request & { user: SafeUser }) {
    return this.subscriptionService.getUserSubscription(req.user.id);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe Checkout session for upgrade' })
  @ApiOkResponse({ description: 'Returns checkout URL' })
  @Post('checkout')
  async createCheckout(
    @Req() req: Request & { user: SafeUser },
    @Body() dto: CreateCheckoutDto,
  ) {
    const url = await this.subscriptionService.createCheckoutSession(
      req.user.id,
      dto.priceId,
      dto.successUrl,
      dto.cancelUrl,
    );
    return { url };
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe Billing Portal session' })
  @ApiOkResponse({ description: 'Returns portal URL' })
  @Post('portal')
  async createPortal(
    @Req() req: Request & { user: SafeUser },
    @Body() dto: CreatePortalDto,
  ) {
    const url = await this.subscriptionService.createBillingPortalSession(
      req.user.id,
      dto.returnUrl,
    );
    return { url };
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  @ApiOkResponse({ description: 'Subscription cancelled' })
  @Post('cancel')
  async cancelSubscription(
    @Req() req: Request & { user: SafeUser },
    @Body() body: { immediate?: boolean },
  ) {
    await this.subscriptionService.cancelSubscription(
      req.user.id,
      body.immediate ?? false,
    );
    return { ok: true };
  }
}
