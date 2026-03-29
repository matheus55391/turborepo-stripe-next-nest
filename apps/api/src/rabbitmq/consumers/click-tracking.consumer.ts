import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../rabbitmq.constants';
import { RabbitMQService } from '../rabbitmq.service';

@Injectable()
export class ClickTrackingConsumer implements OnModuleInit {
  private readonly logger = new Logger(ClickTrackingConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.consume(
      QUEUES.CLICK_TRACKING,
      async (data: unknown) => {
        const { linkId } = data as { linkId: string };
        await this.prisma.click.create({ data: { linkId } });
        this.logger.debug(`Click tracked for link ${linkId}`);
      },
    );
  }
}
