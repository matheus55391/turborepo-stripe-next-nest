import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUES } from '../rabbitmq/rabbitmq.constants';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);
  private readonly frontendOrigin: string;
  private readonly secret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbitmq: RabbitMQService,
  ) {
    this.frontendOrigin = this.config.get<string>(
      'FRONTEND_ORIGIN',
      'http://localhost:3000',
    );
    this.secret = this.config.get<string>('REVALIDATION_SECRET', '');
  }

  /** Enqueue revalidation via RabbitMQ */
  revalidatePage(slug: string): void {
    if (!this.secret) {
      this.logger.warn('REVALIDATION_SECRET not set, skipping ISR revalidation');
      return;
    }
    this.rabbitmq.publish(QUEUES.REVALIDATION, { slug });
  }

  /** Execute the actual HTTP revalidation (called by consumer) */
  async executeRevalidation(slug: string): Promise<void> {
    try {
      const res = await fetch(`${this.frontendOrigin}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidation-secret': this.secret,
        },
        body: JSON.stringify({ slug }),
      });

      if (!res.ok) {
        this.logger.warn(`Revalidation failed for slug "${slug}": ${res.status}`);
      } else {
        this.logger.log(`Revalidated ISR cache for slug "${slug}"`);
      }
    } catch (error) {
      this.logger.warn(`Revalidation request failed for slug "${slug}": ${error}`);
    }
  }
}
