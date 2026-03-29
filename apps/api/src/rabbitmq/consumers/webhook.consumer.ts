import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { SubscriptionService } from '../../subscription/subscription.service';
import { QUEUES } from '../rabbitmq.constants';
import { RabbitMQService } from '../rabbitmq.service';

interface WebhookMessage {
  type: string;
  data: unknown;
}

@Injectable()
export class WebhookConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.consume(
      QUEUES.WEBHOOK_PROCESSING,
      async (data: unknown) => {
        const { type, data: eventData } = data as WebhookMessage;

        switch (type) {
          case 'checkout.session.completed':
            await this.subscriptionService.handleCheckoutCompleted(
              eventData as Stripe.Checkout.Session,
            );
            break;
          case 'customer.subscription.updated':
            await this.subscriptionService.handleSubscriptionUpdated(
              eventData as Stripe.Subscription,
            );
            break;
          case 'customer.subscription.deleted':
            await this.subscriptionService.handleSubscriptionDeleted(
              eventData as Stripe.Subscription,
            );
            break;
        }

        this.logger.debug(`Processed webhook event: ${type}`);
      },
    );
  }
}
