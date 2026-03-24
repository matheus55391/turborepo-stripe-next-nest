import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [SubscriptionModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
