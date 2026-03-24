import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { LinkModule } from './link/link.module';
import { PageModule } from './page/page.module';
import { PrismaModule } from './prisma/prisma.module';
import { StripeModule } from './stripe/stripe.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { WebhookModule } from './webhook/webhook.module';

const apiEnvDir = join(__dirname, '..');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Paths relative to this package (not process.cwd()). `.env` wins over `.env.example` for duplicate keys.
      envFilePath: [join(apiEnvDir, '.env'), join(apiEnvDir, '.env.example')],
    }),
    PrismaModule,
    StripeModule,
    AuthModule,
    PageModule,
    LinkModule,
    SubscriptionModule,
    WebhookModule,
  ],
})
export class AppModule {}
