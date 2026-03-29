import { Global, Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ClickTrackingConsumer } from './consumers/click-tracking.consumer';
import { RevalidationConsumer } from './consumers/revalidation.consumer';
import { StorageCleanupConsumer } from './consumers/storage-cleanup.consumer';
import { WebhookConsumer } from './consumers/webhook.consumer';
import { RabbitMQService } from './rabbitmq.service';

@Global()
@Module({
  imports: [SubscriptionModule],
  providers: [
    RabbitMQService,
    ClickTrackingConsumer,
    RevalidationConsumer,
    StorageCleanupConsumer,
    WebhookConsumer,
  ],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
