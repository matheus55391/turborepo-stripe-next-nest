import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService extends Stripe implements OnModuleInit {
  constructor(private readonly config: ConfigService) {
    super(config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2026-02-25.clover',
    });
  }

  onModuleInit() {
    // Stripe client is ready once the constructor completes
  }

  getWebhookSecret(): string {
    return this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }
}
