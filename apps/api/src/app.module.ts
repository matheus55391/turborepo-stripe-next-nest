import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { LinkModule } from './link/link.module';
import { HttpMetricsInterceptor } from './metrics/http-metrics.interceptor';
import { MetricsModule } from './metrics/metrics.module';
import { PageModule } from './page/page.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerStorageRedis } from './redis/throttler-storage-redis';
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
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino/file', options: { destination: 1 } }
            : undefined,
        autoLogging: { ignore: (req) => (req as { url?: string }).url === '/metrics' },
        redact: ['req.headers.cookie', 'req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'strict', ttl: 60_000, limit: 5 },
      { name: 'click', ttl: 10_000, limit: 10 },
    ]),
    PrismaModule,
    MetricsModule,
    RedisModule,
    StorageModule,
    RabbitMQModule,
    CommonModule,
    StripeModule,
    AuthModule,
    HealthModule,
    PageModule,
    LinkModule,
    SubscriptionModule,
    WebhookModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    { provide: ThrottlerStorage, useClass: ThrottlerStorageRedis },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
