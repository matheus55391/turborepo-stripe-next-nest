import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LinkModule } from './link/link.module';
import { PageModule } from './page/page.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { StripeModule } from './stripe/stripe.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { WebhookModule } from './webhook/webhook.module';

const envsDir = join(__dirname, '..', '..', '..', 'envs');
const nodeEnv = process.env.NODE_ENV ?? 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(envsDir, `.env.${nodeEnv}`),
        join(envsDir, '.env.example'),
      ],
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    CommonModule,
    StripeModule,
    AuthModule,
    PageModule,
    LinkModule,
    SubscriptionModule,
    WebhookModule,
  ],
})
export class AppModule {}
