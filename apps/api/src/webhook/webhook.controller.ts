import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  RawBody,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import Stripe from 'stripe';
import { QUEUES } from '../rabbitmq/rabbitmq.constants';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { StripeService } from '../stripe/stripe.service';

@ApiExcludeController()
@SkipThrottle()
@Controller('webhooks/stripe')
export class WebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly rabbitmq: RabbitMQService,
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

    this.rabbitmq.publish(QUEUES.WEBHOOK_PROCESSING, {
      type: event.type,
      data: event.data.object,
    });

    return { received: true };
  }
}
