import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  /** HTTP request duration in seconds */
  readonly httpRequestDuration: Histogram;

  /** Total HTTP requests */
  readonly httpRequestsTotal: Counter;

  /** Redis cache hits */
  readonly cacheHitsTotal: Counter;
  /** Redis cache misses */
  readonly cacheMissesTotal: Counter;

  /** RabbitMQ messages processed */
  readonly queueProcessedTotal: Counter;
  /** RabbitMQ messages failed */
  readonly queueFailedTotal: Counter;

  /** Auth attempts */
  readonly authAttemptsTotal: Counter;

  constructor() {
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'] as const,
      registers: [this.registry],
    });

    this.cacheHitsTotal = new Counter({
      name: 'cache_hits_total',
      help: 'Total Redis cache hits',
      labelNames: ['key_prefix'] as const,
      registers: [this.registry],
    });

    this.cacheMissesTotal = new Counter({
      name: 'cache_misses_total',
      help: 'Total Redis cache misses',
      labelNames: ['key_prefix'] as const,
      registers: [this.registry],
    });

    this.queueProcessedTotal = new Counter({
      name: 'rabbitmq_messages_processed_total',
      help: 'Total RabbitMQ messages processed successfully',
      labelNames: ['queue'] as const,
      registers: [this.registry],
    });

    this.queueFailedTotal = new Counter({
      name: 'rabbitmq_messages_failed_total',
      help: 'Total RabbitMQ messages that failed (sent to DLQ)',
      labelNames: ['queue'] as const,
      registers: [this.registry],
    });

    this.authAttemptsTotal = new Counter({
      name: 'auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['action', 'result'] as const,
      registers: [this.registry],
    });
  }

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
