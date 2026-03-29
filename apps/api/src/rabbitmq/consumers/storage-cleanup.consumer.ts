import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { QUEUES } from '../rabbitmq.constants';
import { RabbitMQService } from '../rabbitmq.service';

@Injectable()
export class StorageCleanupConsumer implements OnModuleInit {
  private readonly logger = new Logger(StorageCleanupConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly storage: StorageService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.consume(
      QUEUES.STORAGE_CLEANUP,
      async (data: unknown) => {
        const { url } = data as { url: string };
        await this.storage.delete(url);
        this.logger.debug(`Deleted old file: ${url}`);
      },
    );
  }
}
