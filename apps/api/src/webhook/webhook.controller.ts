import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  RawBody,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionService } from '../subscription/subscription.service';

@ApiExcludeController()
@Controller('webhooks/stripe')
export class WebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post()
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.stripe.getWebhookSecret(),
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.subscriptionService.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.subscriptionService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.subscriptionService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
    }

    return { received: true };
  }
}
