import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { DLQ_SUFFIX, MAX_RETRIES, QUEUES } from './rabbitmq.constants';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly url: string;
  private reconnecting = false;
  private destroyed = false;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
  }

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      const connection = await amqplib.connect(this.url);
      const channel = await connection.createChannel();
      await channel.prefetch(1);

      for (const queue of Object.values(QUEUES)) {
        // Assert DLQ first
        await channel.assertQueue(`${queue}${DLQ_SUFFIX}`, { durable: true });
        // Assert main queue with dead-letter config
        await channel.assertQueue(queue, {
          durable: true,
          deadLetterExchange: '',
          deadLetterRoutingKey: `${queue}${DLQ_SUFFIX}`,
        });
      }

      connection.on('error', (err: Error) => {
        this.logger.error(`RabbitMQ connection error: ${err.message}`);
      });

      connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.channel = null;
        this.connection = null;
        void this.reconnect();
      });

      this.connection = connection;
      this.channel = channel;
      this.reconnecting = false;
      this.logger.log('RabbitMQ connected');
    } catch (err) {
      this.logger.warn(`RabbitMQ not available: ${(err as Error).message}`);
      void this.reconnect();
    }
  }

  private async reconnect() {
    if (this.reconnecting || this.destroyed) return;
    this.reconnecting = true;
    this.logger.log('Attempting RabbitMQ reconnect in 5s...');
    await new Promise((r) => setTimeout(r, 5000));
    if (this.destroyed) return;
    await this.connect();
  }

  publish(queue: string, message: unknown): boolean {
    if (!this.channel) {
      this.logger.warn(`Cannot publish to ${queue}: channel not available`);
      return false;
    }
    return this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );
  }

  async consume(
    queue: string,
    handler: (data: unknown) => Promise<void>,
  ): Promise<void> {
    const { channel } = this;
    if (!channel) {
      this.logger.warn(`Cannot consume from ${queue}: channel not available`);
      return;
    }

    await channel.consume(queue, (msg) => {
      if (!msg) return;
      void (async () => {
        try {
          const data: unknown = JSON.parse(msg.content.toString());
          await handler(data);
          channel.ack(msg);
        } catch (err) {
          const retries = getRetryCount(msg);
          if (retries < MAX_RETRIES) {
            this.logger.warn(
              `Retry ${retries + 1}/${MAX_RETRIES} for ${queue}: ${err}`,
            );
            channel.publish('', queue, msg.content, {
              persistent: true,
              headers: {
                ...msg.properties.headers,
                'x-retry-count': retries + 1,
              },
            });
            channel.ack(msg);
          } else {
            this.logger.error(
              `Max retries reached for ${queue}, sending to DLQ: ${err}`,
            );
            channel.nack(msg, false, false);
          }
        }
      })();
    });

    this.logger.log(`Consumer registered for queue "${queue}"`);
  }

  async onModuleDestroy() {
    this.destroyed = true;
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignore close errors during shutdown
    }
  }
}

function getRetryCount(msg: amqplib.ConsumeMessage): number {
  const headers = msg.properties.headers as Record<string, unknown> | undefined;
  const count = headers?.['x-retry-count'];
  return typeof count === 'number' ? count : 0;
}
