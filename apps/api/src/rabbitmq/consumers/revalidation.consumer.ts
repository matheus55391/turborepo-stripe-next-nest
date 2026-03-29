import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RevalidationService } from '../../common/revalidation.service';
import { QUEUES } from '../rabbitmq.constants';
import { RabbitMQService } from '../rabbitmq.service';

@Injectable()
export class RevalidationConsumer implements OnModuleInit {
  private readonly logger = new Logger(RevalidationConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly revalidation: RevalidationService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.consume(QUEUES.REVALIDATION, async (data: unknown) => {
      const { slug } = data as { slug: string };
      await this.revalidation.executeRevalidation(slug);
      this.logger.debug(`Revalidation executed for slug "${slug}"`);
    });
  }
}
